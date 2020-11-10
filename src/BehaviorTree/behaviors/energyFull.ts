import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState/";

export const energyFull = () => (creep: CachedCreep, bb: Blackboard) => {
    if (!creep.gameObj) return BehaviorResult.FAILURE;

    return (creep.capacityFree === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

export const energyNotFull = () => (creep: CachedCreep, bb: Blackboard) => {
    if (!creep.gameObj) return BehaviorResult.FAILURE;

    return (creep.capacityFree !== 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
