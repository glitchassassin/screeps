import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedCreep, CachedSource } from "WorldState/";

export const harvestEnergy = (source: CachedSource) => (creep: CachedCreep, bb: Blackboard) => {
    if (!source.gameObj) return BehaviorResult.FAILURE;

    let result = creep.gameObj.harvest(source.gameObj);

    if (result === OK) return BehaviorResult.INPROGRESS;
    if (result === ERR_TIRED) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
