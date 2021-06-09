import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";

/**
 * @returns SUCCESS if energy is full, FAILURE otherwise
 */
export const energyFull = () => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id)?.free === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

/**
 * @returns SUCCESS if energy is not full, FAILURE otherwise
 */
export const energyNotFull = () => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id)?.free !== 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

/**
 * @returns SUCCESS if energy is empty, FAILURE otherwise
 */
export const energyEmpty = () => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id)?.used === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

