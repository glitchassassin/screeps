import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedCreep, CachedStructure } from "WorldState/";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        repairSite?: CachedStructure
        repairToHits?: number
    }
}

export const repairStructure = (structure: CachedStructure, repairToHits?: number) => (creep: CachedCreep, bb: Blackboard) => {
    if (!bb.repairSite) bb.repairSite = structure;
    if (bb.repairToHits === undefined) bb.repairToHits = repairToHits;

    if (!structure.gameObj) return BehaviorResult.FAILURE;
    if (structure.gameObj.hits === (bb.repairToHits !== undefined ? bb.repairToHits : structure.gameObj.hitsMax)) return BehaviorResult.SUCCESS;

    let result = creep.gameObj.repair(structure.gameObj);
    if (result === OK) return BehaviorResult.INPROGRESS;
    if (result === ERR_NOT_ENOUGH_ENERGY) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
