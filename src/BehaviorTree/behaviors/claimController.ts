import { BehaviorResult } from "BehaviorTree/Behavior";
import { byId } from "utils/gameObjectSelectors";

/**
 * Returns FAILURE if no controller or reserveController returns an error
 * Returns INPROGRESS if reserveController returns OK
 */
export const claimController = (controllerId: Id<StructureController>) => (creep: Creep) => {
    let controller = byId(controllerId);
    if (!controller) return BehaviorResult.FAILURE;

    let result = creep.claimController(controller);

    return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
}
