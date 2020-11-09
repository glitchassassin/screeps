import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState/";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 */
export const ifBuildIsNotFinished = () => (creep: CachedCreep, bb: Blackboard) => {
    if (!bb.buildSite?.gameObj) return BehaviorResult.FAILURE;

    return BehaviorResult.SUCCESS;
}
