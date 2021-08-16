import { FranchisePlan } from "RoomPlanner";
import { serializePlannedStructures } from "Selectors/plannedStructures";
import { EMPTY_ID } from "./FranchisePlan";


export function serializeFranchisePlan(plan?: FranchisePlan) {
    if (!plan) throw new Error('Undefined FranchisePlan, cannot serialize');
    const { sourceId, ...structures } = plan;
    return sourceId + EMPTY_ID.slice(sourceId.length) + serializePlannedStructures(Object.values(structures).flat());
}
