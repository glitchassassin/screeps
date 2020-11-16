import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState/";

export const dropEnergy = (amount?: number) => (creep: CachedCreep, bb: Blackboard) => {

    let result = creep.gameObj.drop(RESOURCE_ENERGY, amount)

    return (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
