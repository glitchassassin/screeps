import { CachedController, CachedCreep } from "WorldState/";

import { BehaviorResult } from "BehaviorTree/Behavior";

export const upgradeController = (controller: CachedController) => (creep: CachedCreep) => {
    if (!controller.gameObj) return BehaviorResult.FAILURE;

    let result = creep.gameObj.upgradeController(controller.gameObj);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
