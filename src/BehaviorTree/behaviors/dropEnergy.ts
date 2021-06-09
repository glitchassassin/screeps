import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

/**
 * Returns SUCCESS if no relevant error dropping resources
 * Returns FAILURE otherwise
 */
export const dropEnergy = (amount?: number) => (creep: Creep, bb: Blackboard) => {

    let result = creep.drop(RESOURCE_ENERGY, amount)

    return (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
