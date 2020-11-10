import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedCreep, CachedStructure } from "WorldState/";

export const transferEnergy = (target?: CachedCreep|CachedStructure<AnyStoreStructure>, amount?: number) => (creep: CachedCreep, bb: Blackboard) => {
    if (!target || !target.gameObj) return BehaviorResult.FAILURE;

    let result = creep.gameObj.transfer(target.gameObj, RESOURCE_ENERGY, amount)

    return (result === OK) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
