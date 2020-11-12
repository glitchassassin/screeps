import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState/";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 */
export const ifRepairIsNotFinished = () => (creep: CachedCreep, bb: Blackboard) => {
    if (bb.repairSite && (bb.repairSite.hits ?? 0) <= (bb.repairToHits !== undefined ? bb.repairToHits : bb.repairSite.hitsMax ?? 0)) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
