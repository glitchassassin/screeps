import { BehaviorResult } from "BehaviorTree/Behavior";
import { byId } from "utils/gameObjectSelectors";

export const upgradeController = (controllerId: Id<StructureController>) => (creep: Creep) => {
    let controller = byId(controllerId);

    if (!controller) return BehaviorResult.FAILURE;

    let result = creep.upgradeController(controller);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
