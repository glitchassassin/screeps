import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedCreep, CachedResource } from "WorldState/";

export const withdrawEnergy = (amount?: number) => (creep: CachedCreep, bb: Blackboard) => {
    if (!bb.target || !bb.target.gameObj) return BehaviorResult.FAILURE;

    let result: ScreepsReturnCode;
    if (bb.target instanceof CachedResource) {
        result = creep.gameObj.pickup(bb.target.gameObj);
    } else if (bb.target instanceof CachedCreep) {
        result = bb.target.gameObj.transfer(creep.gameObj, RESOURCE_ENERGY, amount);
    } else {
        result = creep.gameObj.withdraw(bb.target.gameObj, RESOURCE_ENERGY, amount);
    }

    return (result === OK) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE
}
