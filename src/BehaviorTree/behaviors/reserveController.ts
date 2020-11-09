import { CachedController, CachedCreep } from "WorldState/";

import { BehaviorResult } from "BehaviorTree/Behavior";

export const reserveController = (controller: CachedController) => (creep: CachedCreep) => {
    if (!controller.gameObj) return BehaviorResult.FAILURE;

    let result = creep.gameObj.reserveController(controller.gameObj);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
