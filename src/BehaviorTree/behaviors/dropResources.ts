import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { log } from "utils/logger";

/**
 * Gets a specific resource, or all resources if resourceType is undefined,
 * up to amount.
 *
 * Returns SUCCESS if transfer is successful or creep is full
 * Returns INPROGRESS if creep is not full and there are more types of resources to collect
 * Returns FAILURE if no target or any other error
 */
export const dropResources = (resourceType?: ResourceConstant, amount?: number) => (creep: Creep, bb: Blackboard) => {
    log(creep.name, `dropResources: ${resourceType ?? 'all'} x${amount}`);

    const resourcesToGet = resourceType ? [resourceType] : Object.keys(creep.store) as ResourceConstant[]

    // If resource type isn't specified, get everything
    const res = resourcesToGet.shift();

    // If we're looking for a specific type and there isn't any, we're done
    if (!res || (resourceType && !creep.store[resourceType])) return BehaviorResult.SUCCESS;

    let result = creep.drop(res, amount);
    if (result === ERR_NOT_ENOUGH_RESOURCES) {
        result = creep.drop(res);
    }
    log(creep.name, `dropResources: (${result})`);

    if (resourcesToGet.length) {
        return BehaviorResult.INPROGRESS;
    } else {
        return (result === OK) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
    }
}
