import { BehaviorBuilder, BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedConstructionSite, CachedCreep, CachedStructure } from "WorldState/";

export const repairStructure = (structure: CachedStructure) => (creep: CachedCreep, bb: Blackboard) => {
    if (!structure.gameObj) return BehaviorResult.FAILURE;
    if (structure.gameObj.hits === structure.gameObj.hitsMax) return BehaviorResult.SUCCESS;

    let result = creep.gameObj.repair(structure.gameObj);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
