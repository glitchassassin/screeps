import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

/**
 * Gets a specific resource, or all resources if resourceType is undefined,
 * up to amount.
 *
 * Returns SUCCESS if transfer is successful or creep is full
 * Returns INPROGRESS if creep is not full and there are more types of resources to collect
 * Returns FAILURE if no target or any other error
 */
export const withdrawResources = (resourceType?: ResourceConstant, amount?: number) => (creep: Creep, bb: Blackboard) => {
    let target = byId(bb.target);
    log(creep.name, `withdrawResources: ${target}`);
    if (!target) return BehaviorResult.FAILURE;

    if (target instanceof Resource) {
        let result = creep.pickup(target);
        log(creep.name, `withdrawResources from Resource: ${target} (${result})`);
        // We're done!
        bb.target = undefined;
        return (result === OK || result === ERR_FULL) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
    } else {
        let res = resourceType ?? Capacity.resourcesById(bb.target).shift();

        log(creep.name, `withdrawResources type: ${res} (${Capacity.byId(bb.target, res)?.used})`);

        // If we're looking for a specific type and there isn't any, we're done
        if (!res || !Capacity.byId(bb.target, res)?.used) return BehaviorResult.SUCCESS;
        let result;

        if (target instanceof Creep) {
            result = target.transfer(creep, res, amount);
            if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
                result = target.transfer(creep, res);
            }
            log(creep.name, `withdrawResources from Creep: ${target} (${result})`);
        } else {
            result = creep.withdraw(target, res, amount);
            if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
                result = creep.withdraw(target, res);
            }
            log(creep.name, `withdrawResources from Structure: ${target} (${result})`);
        }

        if (result !== ERR_FULL && Capacity.resourcesById(bb.target).length > 1) {
            return BehaviorResult.INPROGRESS;
        } else {
            bb.target = undefined;
            return (result === OK || result === ERR_FULL) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
        }
    }
}
