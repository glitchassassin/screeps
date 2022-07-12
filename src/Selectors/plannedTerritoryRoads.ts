import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { deserializePlannedStructures } from "./plannedStructures";

const cachedPlans = new Map<string, PlannedStructure[]>()
const MAX_TERRITORY_ROADS = 6;

export function plannedTerritoryRoads(office: string) {
    return [...new Set((Memory.offices[office]?.territories ?? [])
        .flatMap(t => Object.values(Memory.rooms[t]?.franchises?.[office] ?? {}))
        .filter(franchise => franchise.lastHarvested && (franchise.lastHarvested + 3000 > Game.time))
        .sort((a, b) => a.path.length - b.path.length)
        .flatMap(({path}) => {
            const structures = cachedPlans.get(path) ?? deserializePlannedStructures(path);
            cachedPlans.set(path, structures);
            return structures;
        })
    )]
}
