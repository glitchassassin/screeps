import { BehaviorResult } from "BehaviorTree/Behavior";
import { byId } from "utils/gameObjectSelectors";

/**
 * Returns FAILURE if no controller or upgradeController returns an error
 * Returns INPROGRESS if upgradeController returns OK
 */
export const upgradeController = (controllerId: Id<StructureController>) => (creep: Creep) => {
    let controller = byId(controllerId);

    if (!controller) return BehaviorResult.FAILURE;

    let result = creep.upgradeController(controller);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
