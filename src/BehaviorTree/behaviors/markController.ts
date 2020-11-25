import { BehaviorResult } from "BehaviorTree/Behavior";
import { byId } from "utils/gameObjectSelectors";

export const markController = (controllerId: Id<StructureController>, text: string) => {
    return (creep: Creep) => {
        let controller = byId(controllerId);
        if (!controller) return BehaviorResult.FAILURE;
        let result = creep.signController(controller, text);
        return (result === OK) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}
