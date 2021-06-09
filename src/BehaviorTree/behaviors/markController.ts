import { BehaviorResult } from "BehaviorTree/Behavior";
import { byId } from "utils/gameObjectSelectors";

/**
 * @returns FAILURE if the controller is not avilable or the result is an error, SUCCESS if result is OK
 */
export const markController = (controllerId: Id<StructureController>, text: string) => {
    return (creep: Creep) => {
        let controller = byId(controllerId);
        if (!controller) return BehaviorResult.FAILURE;
        let result = creep.signController(controller, text);
        return (result === OK) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
    }
}
