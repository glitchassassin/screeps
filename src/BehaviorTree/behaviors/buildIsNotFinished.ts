import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 */
export const ifBuildIsNotFinished = () => (creep: Creep, bb: Blackboard) => {
    if (!bb.buildSite) return BehaviorResult.FAILURE;

    return BehaviorResult.SUCCESS;
}
