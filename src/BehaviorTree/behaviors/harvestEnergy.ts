import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { byId } from "utils/gameObjectSelectors";

/**
 * @returns FAILURE if source is not found or there is an error; SUCCESS if harvest is OK; or INPROGRESS if waiting for source to refresh
 */
export const harvestEnergy = (sourceId: Id<Source>) => (creep: Creep, bb: Blackboard) => {
    let source = byId(sourceId);
    if (!source) return BehaviorResult.FAILURE;

    let result = creep.harvest(source);

    if (result === OK) return BehaviorResult.SUCCESS;
    if (result === ERR_TIRED) return BehaviorResult.INPROGRESS;
    return BehaviorResult.FAILURE;
}
