import type { RoadsPlan } from "RoomPlanner";
import { deserializePlannedStructures } from "Selectors/plannedStructures";
import { isPlannedStructure } from "Selectors/typeguards";
import { validateRoadsPlan } from "./validateRoadsPlan";


export function deserializeRoadsPlan(serialized: string) {
    const plan: Partial<RoadsPlan> = {
        roads: [],
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_ROAD)(s))
            plan.roads?.push(s);
    }
    return validateRoadsPlan(plan);
}
