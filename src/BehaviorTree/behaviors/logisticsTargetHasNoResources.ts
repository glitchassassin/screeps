import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";
import { log } from "utils/logger";

/**
 * Gets a specific resource, or all resources if resourceType is undefined,
 * up to amount.
 *
 * Returns SUCCESS if Blackboard target has none of specified resource (or does not exist)
 * Returns FAILURE if target does have some of specified resource (or any, if undefined)
 */
export const logisticsTargetHasNoResources = (resourceType?: ResourceConstant, amount?: number) => (creep: Creep, bb: Blackboard) => {
    let target = Capacity.byId(bb.target, resourceType);
    log(creep.name, `logisticsTargetHasNoResources: ${target}`);
    if (!target || target.used === 0) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
