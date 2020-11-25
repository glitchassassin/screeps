import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { byId } from "utils/gameObjectSelectors";

export const withdrawEnergy = (amount?: number) => (creep: Creep, bb: Blackboard) => {
    let target = byId(bb.target);
    if (!target) return BehaviorResult.FAILURE;

    let result: ScreepsReturnCode;
    if (target instanceof Resource) {
        result = creep.pickup(target);
    } else if (target instanceof Creep) {
        result = target.transfer(creep, RESOURCE_ENERGY, amount);
        if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
            result = target.transfer(creep, RESOURCE_ENERGY);
        }
    } else {
        result = creep.withdraw(target, RESOURCE_ENERGY, amount);
        if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) {
            result = creep.withdraw(target, RESOURCE_ENERGY);
        }
    }

    // One way or another, this should not take longer than a single attempt, so clear
    // the target on the blackboard
    bb.target = undefined;

    return (result === OK || result === ERR_FULL) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
