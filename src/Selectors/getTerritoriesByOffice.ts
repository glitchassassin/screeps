import { TERRITORY_RADIUS } from "config";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { costMatrixFromRoomPlan } from "./costMatrixFromRoomPlan";
import { calculateNearbyRooms, isSourceKeeperRoom } from "./MapCoordinates";
import { serializePlannedStructures } from "./plannedStructures";
import { sourcePositions } from "./roomCache";
import { getSpawns, roomPlans } from "./roomPlans";

interface TerritoryData {
    office: string,
    sources: number,
    spawnCapacity: number,
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
    if (lastCalculatedTick !== Game.time) {
        recalculateTerritories();
        lastCalculatedTick = Game.time;
    }
    return Memory.offices[office].territories ?? [];
}

let lastTerritoriesCount = 0;
function shouldRecalculateTerritories() {
    let territories = new Set<string>();
    let offices = Object.keys(Memory.offices).sort()
    const processedOffices = offices.join('-');
    if (lastProcessedOffices !== processedOffices) {
        lastProcessedOffices = processedOffices;
        console.log('Offices are different', processedOffices)
        return true;
    }
    for (const office of offices) {
        if (!Memory.offices[office].territories || Memory.offices[office].territories?.some(t => Memory.rooms[t].owner)) {
            console.log('Office territories invalid', Memory.offices[office].territories)
            return true;
        }
        calculateNearbyRooms(office, TERRITORY_RADIUS, false).forEach(t => {
            if (!isSourceKeeperRoom(t) && Memory.rooms[t] && !Memory.offices[t]) territories.add(t)
        })

    }
    // console.log('known territories', lastTerritoriesCount, territories.size)
    if (territories.size !== lastTerritoriesCount) {
        console.log('Territories are different', territories.size, lastTerritoriesCount)
        return true;
    }
    return false;
}

function recalculateTerritories() {
    if (Game.cpu.bucket < 500) return; // don't recalculate with low bucket

    for (const office of Object.keys(Memory.offices)) {
        const targets = (calculateNearbyRooms(office, TERRITORY_RADIUS, false)
            .filter(t => (!isSourceKeeperRoom(t) && Memory.rooms[t] && !Memory.offices[t]))
            .map(t => {
                if (!Memory.rooms[t].territory) {
                    Memory.rooms[t].territory = calculateTerritoryData(office, t);
                }
                const data = Memory.rooms[t].territory
                return [t, data]
            }) as [string, TerritoryData][])
            .filter(([t, data]) => data)
            .sort(([_1, data1], [_2, data2]) => data2.score - data1.score);

        let spawnCapacity = CREEP_LIFE_TIME * getSpawns(office).length;
        Memory.offices[office].territories = [];
        for (let [territory, data] of targets) {
            Memory.offices[office].territories?.push(territory);
            spawnCapacity -= data.spawnCapacityReserved;
            if (spawnCapacity <= 0) break;
        }
    }
}

function calculateTerritoryData(office: string, territory: string): TerritoryData|undefined {
    const storage = roomPlans(office)?.headquarters?.storage.pos
    if (!storage) return undefined;
    const sourcePaths: PathFinderPath[] = [];
    const roads = new Set<PlannedStructure>();
    for (let pos of sourcePositions(territory)) {
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
    if (sourcePaths.length === 0) return undefined;

    let targetCarry = 0;
    let targetCarryReserved = 0;
    for (let path of sourcePaths) {
        targetCarry += Math.round(((SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME) * path.cost * 2) / CARRY_CAPACITY)
        targetCarryReserved += Math.round(((SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME) * path.cost * 2) / CARRY_CAPACITY)
    }

    const SALESMAN_SIZE = (5 + 2 + 1)
    let spawnCapacity = CREEP_SPAWN_TIME * (SALESMAN_SIZE + targetCarry * 2);
    let spawnCapacityRoads = CREEP_SPAWN_TIME * (SALESMAN_SIZE + targetCarry * 1.5);
    let spawnCapacityReserved = CREEP_SPAWN_TIME * (SALESMAN_SIZE + targetCarryReserved * 1.5);

    const roadsPlan = serializePlannedStructures(Array.from(roads));

    // To score, each criteria is mapped to a number between one and zero. The higher the better.
    const score = (
        (sourcePaths.length / 2) + // Ideally two sources
        (1 / spawnCapacityReserved) // As little spawn capacity as possible
    );

    return {
        office,
        sources: sourcePaths.length,
        spawnCapacity,
        spawnCapacityRoads,
        spawnCapacityReserved,
        targetCarry,
        targetCarryReserved,
        roadsPlan,
        score
    }
}
