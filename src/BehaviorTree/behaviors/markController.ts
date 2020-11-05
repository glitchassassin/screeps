import { CachedController, CachedCreep } from "WorldState";

import { BehaviorResult } from "BehaviorTree/Behavior";

export const markController = (controller: CachedController, text: string) => {
    return (creep: CachedCreep) => {
        if (!creep.gameObj || !controller.gameObj) return BehaviorResult.FAILURE;
        let result = creep.gameObj.signController(controller.gameObj, text);
        return (result === OK) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}
