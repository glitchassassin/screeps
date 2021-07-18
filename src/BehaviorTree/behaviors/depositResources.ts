import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedStructure } from "WorldState/Structures";
import { log } from "utils/logger";

/**
 * Gets a specific resource, or all resources if resourceType is undefined,
 * up to amount.
 *
 * Returns SUCCESS if transfer is successful or creep is full
 * Returns INPROGRESS if creep is not full and there are more types of resources to collect
 * Returns FAILURE if no target or any other error
 */
export const depositResources = (target: CachedStructure<AnyStoreStructure>, resourceType?: ResourceConstant, amount?: number) => (creep: Creep, bb: Blackboard) => {
    log(creep.name, `depositResources: ${target}`);
    if (!target || !(target instanceof Structure)) return BehaviorResult.FAILURE;

    const resourcesToGet = resourceType ? [resourceType] : Object.keys(creep.store) as ResourceConstant[]

    // If resource type isn't specified, get everything
    const res = resourcesToGet.shift();

    // If we're looking for a specific type and there isn't any, we're done
    if (!res || (resourceType && !creep.store[resourceType])) return BehaviorResult.SUCCESS;

    let result = creep.transfer(target, res, amount);
    if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
        result = creep.transfer(target, res);
    }
    log(creep.name, `depositResources to target: ${target} (${result})`);

    if (resourcesToGet.length) {
        return BehaviorResult.INPROGRESS;
    } else {
        return (result === OK || result === ERR_FULL) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
    }
}
