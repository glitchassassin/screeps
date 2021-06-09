import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";
import { byId } from "utils/gameObjectSelectors";

/**
 * Returns FAILURE if no target or target has no free space
 * Returns SUCCESS if transfer was successful, creep is empty, or target is full
 * Returns FAILURE for any other errors
 */
export const transferEnergy = (targetId?: Id<Creep|AnyStoreStructure>, amount?: number) => (creep: Creep, bb: Blackboard) => {
    let target = byId(targetId);
    if (!target || !Capacity.byId(targetId)?.free) return BehaviorResult.FAILURE;

    let result = creep.transfer(target, RESOURCE_ENERGY, amount)

    return (result === OK || result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
