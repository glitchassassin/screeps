import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState/";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 */
export const ifRepairIsNotFinished = () => (creep: CachedCreep, bb: Blackboard) => {
    if (bb.repairSite && bb.repairSite.hits !== bb.repairSite.hitsMax) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
