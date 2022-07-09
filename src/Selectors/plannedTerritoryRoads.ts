import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { deserializePlannedStructures } from "./plannedStructures";

const cachedPlans = new Map<string, PlannedStructure[]>()
const MAX_TERRITORY_ROADS = 6;

export function plannedTerritoryRoads(office: string) {
    return [...new Set((Memory.offices[office]?.territories ?? [])
        .flatMap(t => Object.values(Memory.rooms[t]?.officePaths[office] ?? {}))
        .sort((a, b) => a.length - b.length)
        .slice(0, MAX_TERRITORY_ROADS)
        .flatMap(roads => {
            const structures = cachedPlans.get(roads) ?? deserializePlannedStructures(roads);
            cachedPlans.set(roads, structures);
            return structures;
        })
    )]
}
