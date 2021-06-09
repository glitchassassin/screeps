import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

/**
 * Returns SUCCESS if transfer is successful or creep is full
 * Returns FAILURE if no target or any other error
 */
export const withdrawEnergy = (amount?: number) => (creep: Creep, bb: Blackboard) => {
    let target = byId(bb.target);
    log(creep.name, `withdrawEnergy: ${target}`);
    if (!target) return BehaviorResult.FAILURE;

    let result: ScreepsReturnCode;
    if (target instanceof Resource) {
        result = creep.pickup(target);
        log(creep.name, `withdrawEnergy from Resource: ${target} (${result})`);
    } else if (target instanceof Creep) {
        result = target.transfer(creep, RESOURCE_ENERGY, amount);
        if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
            result = target.transfer(creep, RESOURCE_ENERGY);
        }
        log(creep.name, `withdrawEnergy from Creep: ${target} (${result})`);
    } else {
        result = creep.withdraw(target, RESOURCE_ENERGY, amount);
        if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
            result = creep.withdraw(target, RESOURCE_ENERGY);
        }
        log(creep.name, `withdrawEnergy from Structure: ${target} (${result})`);
    }

    // One way or another, this should not take longer than a single attempt, so clear
    // the target on the blackboard
    bb.target = undefined;

    return (result === OK || result === ERR_FULL) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
