import type { ExtensionsPlan } from "RoomPlanner";
import { deserializePlannedStructures } from "Selectors/plannedStructures";
import { validateExtensionsPlan } from "./validateExtensionsPlan";


export function deserializeExtensionsPlan(serialized: string) {
    const plan: Partial<ExtensionsPlan> = {
        extensions: [],
        ramparts: [],
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_EXTENSION)
            plan.extensions?.push(s);
        if (s.structureType === STRUCTURE_RAMPART)
            plan.ramparts?.push(s);
    }
    return validateExtensionsPlan(plan);
}
