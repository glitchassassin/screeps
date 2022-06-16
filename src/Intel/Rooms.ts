import { MINERALS } from "gameConstants";
import { scanRoomPlanStructures } from "RoomPlanner/scanRoomPlanStructures";
import { destroyUnplannedStructures } from "Selectors/facilitiesWorkToDo";
import { findHostileCreeps } from "Selectors/findHostileCreeps";
import { ownedMinerals } from "Selectors/ownedMinerals";
import { roomIsEligibleForOffice } from "Selectors/roomIsEligibleForOffice";
import { cityNames } from "utils/CityNames";
import { packPos } from "utils/packrat";
import profiler from "utils/profiler";

declare global {
    interface RoomMemory {
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
        invaderCore?: number,
        hasLootEnergy?: boolean,
        hasLootResources?: boolean,
    }
    interface Memory {
        positions: Record<string, string>
    }
}

export const scanRooms = profiler.registerFN(() => {
    Memory.positions ??= {};
    Memory.rooms ??= {};

    // Purge dead offices
    for (let office in Memory.offices) {
        if (!Game.rooms[office]?.controller?.my) {
            delete Memory.offices[office];
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
            }
        }

        // Refresh this when visible
        Memory.rooms[room].rcl = Game.rooms[room].controller?.level
        Memory.rooms[room].owner = Game.rooms[room].controller?.owner?.username
        Memory.rooms[room].reserver = Game.rooms[room].controller?.reservation?.username
        Memory.rooms[room].reservation = Game.rooms[room].controller?.reservation?.ticksToEnd
        Memory.rooms[room].scanned = Game.time

        if (findHostileCreeps(room).length) Memory.rooms[room].lastHostileSeen = Game.time
        if (Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: STRUCTURE_INVADER_CORE }).length > 0) {
            Memory.rooms[room].invaderCore = Game.time
        } else {
            delete Memory.rooms[room].invaderCore
        }
        // If room is unowned and has resources, let's loot it!
        if (!Game.rooms[room].controller?.owner?.username) {
            const lootStructures = Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: s => 'store' in s && Object.keys(s.store).length }) as AnyStoreStructure[];

            Memory.rooms[room].hasLootEnergy = false;
            Memory.rooms[room].hasLootResources = false;

            lootStructures.forEach(s => {
                Memory.rooms[room].hasLootEnergy ||= s.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
                Memory.rooms[room].hasLootResources ||= Object.keys(s.store).filter(s => s !== RESOURCE_ENERGY).length > 0
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
}, 'scanRooms');
