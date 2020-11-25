import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { byId } from "utils/gameObjectSelectors";

export const harvestEnergy = (sourceId: Id<Source>) => (creep: Creep, bb: Blackboard) => {
    let source = byId(sourceId);
    if (!source) return BehaviorResult.FAILURE;

    let result = creep.harvest(source);

    if (result === OK) return BehaviorResult.INPROGRESS;
    if (result === ERR_TIRED) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
