import { BehaviorResult } from "BehaviorTree/Behavior";
import { byId } from "utils/gameObjectSelectors";

export const reserveController = (controllerId: Id<StructureController>) => (creep: Creep) => {
    let controller = byId(controllerId);
    if (!controller) return BehaviorResult.FAILURE;

    let result = creep.reserveController(controller);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
