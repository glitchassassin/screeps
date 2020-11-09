import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState/";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 */
export const buildSite = () => (creep: CachedCreep, bb: Blackboard) => {
    if (!bb.buildSite) return BehaviorResult.FAILURE;
    if (!bb.buildSite?.gameObj) return BehaviorResult.SUCCESS;

    let result = creep.gameObj.build(bb.buildSite.gameObj);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
