import { TERRITORY_RADIUS } from "config";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { logCpu, logCpuStart } from "utils/logCPU";
import { costMatrixFromRoomPlan } from "./costMatrixFromRoomPlan";
import { calculateNearbyRooms, getClosestOffice, isSourceKeeperRoom } from "./MapCoordinates";
import { serializePlannedStructures } from "./plannedStructures";
import { sourcePositions } from "./roomCache";
import { roomPlans } from "./roomPlans";
import { getTerritoryIntent, TerritoryIntent } from "./territoryIntent";

interface TerritoryData {
    office: string,
    sources: number,
    spawnCapacity: number,
    cpuCapacity: number,
    spawnCapacityRoads: number,
    spawnCapacityReserved: number,
    targetCarry: number,
    targetCarryReserved: number,
    roadsPlan: string,
    disabled?: number,
    score: number
}
declare global {
    interface RoomMemory {
        territory?: TerritoryData
    }
    interface OfficeMemory {
        territories?: string[]
    }
}

const MAX_TERRITORY_SPAWN_CAPACITY = 1200;
let lastProcessedOffices = '';

let lastCalculatedTick = 0;

export const getTerritoriesByOffice = (office: string) => {
    // logCpuStart()
    if (lastCalculatedTick !== Game.time) {
        recalculateTerritories();
        lastCalculatedTick = Game.time;
        // logCpu('Recalculated territories')
    }
    return Memory.offices[office].territories ?? [];
}

function recalculateTerritories() {
    if (Game.cpu.bucket < 500) return; // don't recalculate with low bucket

    logCpuStart()
    for (const office of Object.keys(Memory.offices)) {
        const targets = (calculateNearbyRooms(office, TERRITORY_RADIUS, false)
            .filter(t => (
                !isSourceKeeperRoom(t) &&
                Memory.rooms[t] &&
                !Memory.offices[t] &&
                getClosestOffice(t) === office &&
                getTerritoryIntent(t) !== TerritoryIntent.AVOID
            ))
            .map(t => {
                if (Memory.rooms[t].territory?.office !== office) {
                    Memory.rooms[t].territory = calculateTerritoryData(office, t);
                    logCpu('Calculating territory data')
                }
                const data = Memory.rooms[t].territory
                return [t, data]
            }) as [string, TerritoryData][])
            .filter(([t, data]) => data?.office === office)
            .sort(([_1, data1], [_2, data2]) => data2.score - data1.score);

        let efficiency = 0.75;
        let spawnCapacity = CREEP_LIFE_TIME * efficiency; // Only count one spawn towards remote territories
        let cpuCapacity = (Game.cpu.limit / Object.keys(Memory.offices).length) - 4; // Approximate 4 cpu for normal operations
        Memory.offices[office].territories = [];
        for (let [territory, data] of targets) {
            if (data.sources === 0) continue;
            Memory.offices[office].territories?.push(territory);
            spawnCapacity -= data.spawnCapacityReserved;
            cpuCapacity -= data.cpuCapacity;
            if (spawnCapacity <= 0 || cpuCapacity <= 0) break;
        }
    }
}

function calculateTerritoryData(office: string, territory: string): TerritoryData|undefined {
    const data: TerritoryData = {
        office,
        sources: 0,
        spawnCapacity: 0,
        cpuCapacity: 0,
        spawnCapacityRoads: 0,
        spawnCapacityReserved: 0,
        targetCarry: 0,
        targetCarryReserved: 0,
        roadsPlan: '',
        score: 0
    }
    const storage = roomPlans(office)?.headquarters?.storage.pos
    if (!storage) return undefined;
    let sources = sourcePositions(territory);
    data.sources = sources.length;
    if (data.sources === 0) return data;
    const sourcePaths: PathFinderPath[] = [];
    const roads = new Set<PlannedStructure>();
    for (let pos of sources) {
        let route = PathFinder.search(storage, {pos, range: 1}, {
            roomCallback: (room) => {
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
            route.path.forEach(p => {
                if (p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49) {
                    roads.add(new PlannedStructure(p, STRUCTURE_ROAD))
                }
            })
        }
    }
    if (sourcePaths.length === 0) return data;

    for (let path of sourcePaths) {
        data.targetCarry += Math.round(((SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME) * path.cost * 2) / CARRY_CAPACITY)
        data.targetCarryReserved += Math.round(((SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME) * path.cost * 2) / CARRY_CAPACITY)
    }

    const SALESMAN_SIZE = (5 + 2 + 1)
    data.spawnCapacity = CREEP_SPAWN_TIME * (SALESMAN_SIZE + data.targetCarry * 2);
    data.spawnCapacityRoads = CREEP_SPAWN_TIME * (SALESMAN_SIZE + data.targetCarry * 1.5);
    data.spawnCapacityReserved = CREEP_SPAWN_TIME * (SALESMAN_SIZE + data.targetCarryReserved * 1.5);
    data.cpuCapacity = 0.5 + 0.5 * Math.ceil((data.targetCarry * BODYPART_COST[CARRY] * 2) / Game.rooms[office].energyCapacityAvailable);

    data.roadsPlan = serializePlannedStructures(Array.from(roads));

    // To score, each criteria is mapped to a number between one and zero. The higher the better.
    data.score = (
        (sourcePaths.length / data.spawnCapacityReserved) // As little spawn capacity as possible
    );

    return data;
}
