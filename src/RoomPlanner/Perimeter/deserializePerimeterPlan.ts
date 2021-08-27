import type { PerimeterPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { validatePerimeterPlan } from "./validatePerimeterPlan";


export function deserializePerimeterPlan(serialized: string) {
    const plan: PerimeterPlan = {
        ramparts: []
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_RAMPART)
            plan.ramparts.push(s);
    }
    return validatePerimeterPlan(plan);
}
