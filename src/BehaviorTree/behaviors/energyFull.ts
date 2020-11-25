import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";

export const energyFull = () => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id)?.free === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

export const energyNotFull = () => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id)?.free !== 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
