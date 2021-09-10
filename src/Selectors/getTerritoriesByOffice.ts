import { TERRITORY_RADIUS } from "config";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { logCpuStart } from "utils/logCPU";
import { costMatrixFromRoomPlan } from "./costMatrixFromRoomPlan";
import { calculateNearbyRooms, isSourceKeeperRoom } from "./MapCoordinates";
import { serializePlannedStructures } from "./plannedStructures";
import { sourcePositions } from "./roomCache";
import { roomPlans } from "./roomPlans";

interface TerritoryData {
    office: string,
    sources: number,
    spawnCapacity: number,
    spawnCapacityRoads: number,
    spawnCapacityReserved: number,
    targetCarry: number,
    targetCarryReserved: number,
    roadsPlan: string,
    disabled?: number
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

export const getTerritoriesByOffice = (office: string) => {
    logCpuStart()
    if (shouldRecalculateTerritories()) {
        recalculateTerritories()
        // console.log('recalculating territories', Memory.offices[office].territories);
    }
    return Memory.offices[office].territories ?? [];
}

let lastTerritoriesCount = 0;
function shouldRecalculateTerritories() {
    let territories = new Set<string>();
    let offices = Object.keys(Memory.offices)
    const processedOffices = offices.join('-');
    if (lastProcessedOffices !== processedOffices) {
        lastProcessedOffices = processedOffices;
        return true;
    }
    for (const office of offices) {
        if (!Memory.offices[office].territories || Memory.offices[office].territories?.some(t => Memory.rooms[t].owner)) {
            return true;
        }
        calculateNearbyRooms(office, TERRITORY_RADIUS, false).forEach(t => {
            if (!isSourceKeeperRoom(t) && Memory.rooms[t]) territories.add(t)
        })

    }
    // console.log('known territories', lastTerritoriesCount, territories.size)
    if (territories.size !== lastTerritoriesCount) {
        return true;
    }
    return false;
}

function recalculateTerritories() {
    if (Game.cpu.bucket < 500) return; // don't recalculate with low bucket
    let territories = new Set<string>();
    const offices = Object.keys(Memory.offices);
    const officeSpawnCapacity = new Map<string, number>();

    const candidates = new Map<string, Set<string>>();
    for (const office of offices) {
        officeSpawnCapacity.set(office, 0)
        Memory.offices[office].territories = [];
        // Add surrounding rooms to the list of potential territories
        calculateNearbyRooms(office, TERRITORY_RADIUS, false).forEach(t => {
            if (!isSourceKeeperRoom(t) && Memory.rooms[t]) territories.add(t)
        })
    }
    lastTerritoriesCount = territories.size;

    for (const territory of territories) {
        const officeList = new Set<string>();
        candidates.set(territory, officeList);
        for (const office of offices) {
            const route = Game.map.findRoute(territory, office);
            if (route === ERR_NO_PATH || route.length > TERRITORY_RADIUS) continue;
            officeList.add(office);
        }
        if (officeList.size === 1) {
            // Only one viable office! Skip remaining distribution
            const [office, ..._] = officeList;
            const territoryData = calculateTerritoryData(office, territory);
            // console.log('Assigning to', office, JSON.stringify(territoryData, null, 2))
            if (territoryData) {
                Memory.offices[office].territories ??= []
                Memory.offices[office].territories?.push(territory)
                Memory.rooms[territory].territory = territoryData

                const capacity = territoryData.spawnCapacity

                officeSpawnCapacity.set(office, officeSpawnCapacity.get(office)! + capacity)
            }
            candidates.delete(territory);
        }
    }

    // Prune offices with too many territories
    for (let [office, capacity] of officeSpawnCapacity) {
        let currentCapacity = capacity;
        while (currentCapacity > MAX_TERRITORY_SPAWN_CAPACITY) {
            // Find worst territory
            const territory = (Memory.offices[office].territories ?? []).reduce((furthest, current) => {
                const territoryData = Memory.rooms[current]?.territory;
                if (!territoryData || territoryData.spawnCapacity / territoryData.sources < furthest.capacity) return furthest;
                return {
                    capacity: territoryData.spawnCapacity / territoryData.sources,
                    name: current
                }
            }, {capacity: 0, name: ''})
            if (!territory) continue;
            Memory.offices[office].territories = Memory.offices[office].territories?.filter(t => t !== territory.name)
            candidates.set(territory.name, new Set<string>());
            const capacity = Memory.rooms[territory.name].territory?.spawnCapacity
            currentCapacity -= capacity ?? 0;
            delete Memory.rooms[territory.name].territory;
        }
        officeSpawnCapacity.set(office, currentCapacity);
    }

    // Find an available office for remaining candidate territories
    for (const [territory, offices] of candidates) {
        if (offices.size === 0) continue;
        let parentOffice = undefined;
        for (const office of offices) {
            parentOffice ??= office;
            if ((Memory.offices[office]?.territories?.length ?? 0) < (Memory.offices[parentOffice]?.territories?.length ?? 0)) {
                parentOffice = office;
            }
        }
        if (!parentOffice) continue; // No viable offices

        const territoryData = calculateTerritoryData(parentOffice, territory);
        if (territoryData) {
            Memory.offices[parentOffice].territories ??= []
            Memory.offices[parentOffice].territories?.push(territory)
            Memory.rooms[territory].territory = territoryData

            const capacity = territoryData.spawnCapacity

            officeSpawnCapacity.set(parentOffice, officeSpawnCapacity.get(parentOffice)! + capacity)
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

    return {
        office,
        sources: sourcePaths.length,
        spawnCapacity,
        spawnCapacityRoads,
        spawnCapacityReserved,
        targetCarry,
        targetCarryReserved,
        roadsPlan,
    }
}
