import { TERRITORY_RADIUS } from "config";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { logCpu, logCpuStart } from "utils/logCPU";
import { costMatrixFromRoomPlan } from "./costMatrixFromRoomPlan";
import { calculateNearbyRooms, getClosestOffice, isSourceKeeperRoom } from "./MapCoordinates";
import { serializePlannedStructures } from "./plannedStructures";
import { posById } from "./posById";
import { sourceIds } from "./roomCache";
import { roomPlans } from "./roomPlans";
import { getTerritoryIntent, TerritoryIntent } from "./territoryIntent";

interface TerritoryData {
    office: string,
    sources: Record<string, SourceData>
}
interface SourceData {
    roads: string,
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
    if (Game.time % 50 !== 0) return; // run once every 50 ticks

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
                }
                const data = Memory.rooms[t].territory
                return [t, data]
            }) as [string, TerritoryData][])
            .filter(([t, data]) => data?.office === office)
        logCpu('Checking territories')

        Memory.offices[office].territories = [];
        for (let [territory, data] of targets) {
            if (Object.keys(data.sources).length === 0) continue;
            Memory.offices[office].territories?.push(territory);
        }
    }
}

function calculateTerritoryData(office: string, territory: string): TerritoryData|undefined {
    const data: TerritoryData = {
        office,
        sources: {}
    }
    const storage = roomPlans(office)?.headquarters?.storage.pos
    if (!storage) return undefined;
    let sources = sourceIds(territory);
    if (sources.length === 0) return data;
    const sourcePaths: PathFinderPath[] = [];
    const roads = new Set<PlannedStructure>();
    for (const sourceId of sources) {
        const pos = posById(sourceId);
        if (!pos) continue;
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
            const sourceRoads = new Set<PlannedStructure>();
            route.path.forEach(p => {
                if (p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49) {
                    roads.add(new PlannedStructure(p, STRUCTURE_ROAD))
                    sourceRoads.add(new PlannedStructure(p, STRUCTURE_ROAD))
                }
            })
            data.sources[sourceId] = {
                roads: serializePlannedStructures(Array.from(sourceRoads))
            };
        }
    }

    return data;
}
