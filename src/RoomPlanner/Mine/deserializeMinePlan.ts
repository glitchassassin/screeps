import type { MinePlan } from "RoomPlanner";
import { deserializePlannedStructures } from "Selectors/plannedStructures";
import { validateMinePlan } from "./validateMinePlan";


export function deserializeMinePlan(serialized: string) {
    const plan: Partial<MinePlan> = {
        extractor: undefined,
        container: undefined,
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_EXTRACTOR)
            plan.extractor = s;
        if (s.structureType === STRUCTURE_CONTAINER)
            plan.container = s;
    }
    return validateMinePlan(plan);
}
