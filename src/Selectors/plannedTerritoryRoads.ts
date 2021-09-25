import { PlannedStructure } from "RoomPlanner/PlannedStructure"
import { deserializePlannedStructures } from "./plannedStructures"

const cachedPlans = new Map<string, PlannedStructure[]>()

export function plannedTerritoryRoads(office: string) {
    return (Memory.offices[office]?.territories ?? []).flatMap(t => {
        const plan = Memory.rooms[t].territory?.roadsPlan
        if (plan) {
            const structures = cachedPlans.get(plan) ?? deserializePlannedStructures(plan);
            cachedPlans.set(plan, structures);
            return structures;
        }
        return [];
    })
}
