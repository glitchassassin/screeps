import { TERRITORY_RADIUS } from "config";
import { MINERALS } from "gameConstants";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { scanRoomPlanStructures } from "RoomPlanner/scanRoomPlanStructures";
import { calculateThreatLevel, ThreatLevel } from "Selectors/Combat/threatAnalysis";
import { costMatrixFromRoomPlan } from "Selectors/costMatrixFromRoomPlan";
import { destroyUnplannedStructures } from "Selectors/facilitiesWorkToDo";
import { getOfficeDistanceByRange } from "Selectors/getOfficeDistance";
import { getRoomPathDistance } from "Selectors/Map/Pathing";
import { ownedMinerals } from "Selectors/ownedMinerals";
import { serializePlannedStructures } from "Selectors/plannedStructures";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { sourceIds } from "Selectors/roomCache";
import { roomIsEligibleForOffice } from "Selectors/roomIsEligibleForOffice";
import { roomPlans } from "Selectors/roomPlans";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import { cityNames } from "utils/CityNames";
import { packPos } from "utils/packrat";
import profiler from "utils/profiler";

declare global {
    interface RoomMemory {
        scanned?: number
        controllerId?: Id<StructureController>,
        sourceIds?: Id<Source>[],
        mineralId?: Id<Mineral>,
        mineralType?: MineralConstant,
        rcl?: number,
        owner?: string,
        reserver?: string,
        reservation?: number,
        rclMilestones?: Record<number, number>,
        eligibleForOffice?: boolean,
        lastHostileSeen?: number,
        lastAcquireAttempt?: number,
        acquireAttempts?: number,
        invaderCore?: number,
        lootEnergy?: number,
        lootResources?: number,
        office?: string,
        officesInRange: string,
        franchises: Record<string, Record<Id<Source>, {
            path: string,
            lastHarvested?: number
        }>>,
        threatLevel?: [ThreatLevel, number]
    }
    interface Memory {
        positions: Record<string, string>
    }
}

let offices: string;

export const scanRooms = profiler.registerFN(() => {
    Memory.positions ??= {};
    Memory.rooms ??= {};

    // Purge dead offices
    for (let office in Memory.offices) {
        if (rcl(office) > 1 && !Game.rooms[office]?.find(FIND_MY_SPAWNS).length) {
            // Office was destroyed
            Game.rooms[office]?.controller?.unclaim();
        }
        if (!Game.rooms[office]?.controller?.my) {
            delete Memory.offices[office];
            delete Memory.stats.offices[office];
        }
    }

    for (let room in Game.rooms) {
        // Only need to store this once
        if (Memory.rooms[room]?.eligibleForOffice === undefined) {
            const controllerId = Game.rooms[room].controller?.id;
            if (Game.rooms[room].controller) {
                Memory.positions[Game.rooms[room].controller!.id] = packPos(Game.rooms[room].controller!.pos)
            }
            const sourceIds = Game.rooms[room].find(FIND_SOURCES).map(s => {
                Memory.positions[s.id] = packPos(s.pos);
                return s.id
            });
            const { mineralId, mineralType } = Game.rooms[room].find(FIND_MINERALS).map(m => {
                Memory.positions[m.id] = packPos(m.pos);
                return {mineralId: m.id, mineralType: m.mineralType};
            })[0] ?? {};
            const eligibleForOffice = roomIsEligibleForOffice(room)

            Memory.rooms[room] = {
                controllerId,
                sourceIds,
                mineralId,
                mineralType,
                eligibleForOffice,
                officesInRange: '',
                franchises: {},
                threatLevel: calculateThreatLevel(room),
            }

            // Calculate nearby offices and assign
            recalculateTerritoryOffices(room);
        }

        // Recalculate territory paths when room planning is complete
        if (room in Memory.offices && roomPlans(room)?.headquarters && Object.keys(Memory.rooms[room].franchises[room] ?? {}).length === 0) {
            console.log('Recalculating internal franchise paths for office', room)
            Memory.rooms[room].officesInRange = '';
            recalculateTerritoryOffices(room);
        }

        // Refresh this when visible
        Memory.rooms[room].rcl = Game.rooms[room].controller?.level
        Memory.rooms[room].owner = Game.rooms[room].controller?.owner?.username
        Memory.rooms[room].reserver = Game.rooms[room].controller?.reservation?.username
        Memory.rooms[room].reservation = Game.rooms[room].controller?.reservation?.ticksToEnd
        Memory.rooms[room].scanned = Game.time

        const threatLevel = calculateThreatLevel(room)
        Memory.rooms[room].threatLevel = threatLevel;

        if (threatLevel[1]) Memory.rooms[room].lastHostileSeen = Game.time
        if (Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType === STRUCTURE_INVADER_CORE }).length > 0) {
            Memory.rooms[room].invaderCore = Game.time
        } else {
            delete Memory.rooms[room].invaderCore
        }
        // If room is unowned and has resources, let's loot it!
        if (![ThreatLevel.OWNED, ThreatLevel.FRIENDLY].includes(threatLevel[0])) {
            const lootStructures = Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: s => 'store' in s && Object.keys(s.store).length }) as AnyStoreStructure[];

            Memory.rooms[room].lootEnergy = 0;
            Memory.rooms[room].lootResources = 0;

            lootStructures.forEach(s => {
                Memory.rooms[room].lootEnergy! += s.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
                Memory.rooms[room].lootResources! += (s.store.getUsedCapacity() ?? 0) - (s.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0);
            });
        }

        // Assign office, if necessary
        Memory.offices ??= {}
        if (Game.rooms[room].controller?.my) {
            Memory.rooms[room].rclMilestones ??= {};
            Memory.rooms[room].rclMilestones![Game.rooms[room].controller!.level] ??= Game.time;

            if (!Memory.offices[room]) {
                // Initialize new office
                Memory.offices[room] = {
                    city: cityNames.find(name => !Object.values(Memory.offices).some(r => r.city === name)) ?? room,
                    resourceQuotas: {
                        [RESOURCE_ENERGY]: 10000,
                    },
                    lab: {
                        orders: [],
                        boosts: [],
                        boostingLabs: [],
                    },
                    spawnQueue: [],
                    pendingMissions: [],
                    activeMissions: [],
                    missionResults: {}
                }
                destroyUnplannedStructures(room);
            }
            Memory.offices[room].lab ??= {
                orders: [],
                boosts: [],
                boostingLabs: [],
            }
            // TODO Remove patch
            Memory.offices[room].lab.boostingLabs ??= [];

            Memory.offices[room].resourceQuotas = {
                [RESOURCE_ENERGY]: 10000
            }
            for (let m of ownedMinerals()) {
                Memory.offices[room].resourceQuotas[m as ResourceConstant] = 3000
            }
            for (let o of Memory.offices[room].lab.orders) {
                if (MINERALS.includes(o.ingredient1)) {
                    Memory.offices[room].resourceQuotas[o.ingredient1] = 3000
                }
                if (MINERALS.includes(o.ingredient2)) {
                    Memory.offices[room].resourceQuotas[o.ingredient2] = 3000
                }
            }

        }

        scanRoomPlanStructures(room);
    }

    // Recalculate territory assignments, if needed
    const currentOffices = Object.keys(Memory.offices).sort().join('_');
    if (offices !== currentOffices) {
        // Offices have changed
        console.log('Offices have changed, recalculating territories')
        offices = currentOffices;
        const startingCpu = Game.cpu.getUsed();
        for (const room in Memory.rooms) {
            Memory.rooms[room].officesInRange ??= '';
            Memory.rooms[room].franchises ??= {};
            // if (room in Memory.offices) continue; // skip check for existing offices
            recalculateTerritoryOffices(room);
            // console.log(room, '->', Memory.rooms[room].office);

            if (Game.cpu.getUsed() - startingCpu > 200) {
                // continue next tick if we take more than 200 CPU
                offices = '';
                break;
            }
        }
    }
}, 'scanRooms');

function recalculateTerritoryOffices(room: string) {
    const officesInRange = Object.keys(Memory.offices)
        .filter(o => {
            const range = getOfficeDistanceByRange(o, room);
            if (range > TERRITORY_RADIUS) return false;
            const distance = getRoomPathDistance(o, room);
            if (distance === undefined || distance > TERRITORY_RADIUS) return false;
            return true;
        })
        .sort()
    const key = officesInRange.join('_');
    if (Memory.rooms[room].officesInRange !== key) {
        console.log('Offices in range of', room, 'have changed, recalculating paths')
        Memory.rooms[room].officesInRange = key;
        // Offices in range of this room have changed; recalculate paths, if needed
        for (const office of officesInRange) {
            const data = calculateTerritoryData(office, room)
            if (data) Memory.rooms[room].franchises[office] = data;
        }
    }
}

function calculateTerritoryData(office: string, territory: string): Record<Id<Source>, { path: string }>|undefined {
    const data: Record<Id<Source>, { path: string }> = { };

    const storage = roomPlans(office)?.headquarters?.storage.pos
    if (!storage) return undefined;
    let sources = sourceIds(territory);
    if (sources.length === 0) return undefined;
    const sourcePaths: PathFinderPath[] = [];
    const roads = new Set<PlannedStructure>();
    for (const sourceId of sources) {
        const pos = posById(sourceId);
        if (!pos) continue;
        let route = PathFinder.search(storage, {pos, range: 1}, {
            roomCallback: (room) => {
                if (getTerritoryIntent(room) === TerritoryIntent.AVOID) return false;
                const cm = costMatrixFromRoomPlan(room);
                for (let road of roads) {
                    if (road.pos.roomName === room && cm.get(road.pos.x, road.pos.y) !== 255) {
                        cm.set(road.pos.x, road.pos.y, 1);
                    }
                }
                return cm;
            },
            plainCost: 2,
            swampCost: 10,
            maxOps: 100000,
        })
        if (!route.incomplete) {
            sourcePaths.push(route);
            const sourceRoads = new Set<PlannedStructure>();
            route.path.forEach(p => {
                if (p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49) {
                    roads.add(new PlannedStructure(p, STRUCTURE_ROAD))
                    sourceRoads.add(new PlannedStructure(p, STRUCTURE_ROAD))
                }
            })
            data[sourceId] = { path: serializePlannedStructures(Array.from(sourceRoads)) };
        }
    }

    return data;
}
