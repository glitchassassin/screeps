import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { Sequence } from "BehaviorTree/Behavior";
import { findLogisticsSource } from "./findLogisticsSource";
import { withdrawResources } from "./withdrawResources";

export const withdrawFromLogisticsSource = (pos: RoomPosition, includeAdjacent = true, resource?: ResourceConstant) => {
    return Sequence(
        findLogisticsSource(pos, includeAdjacent, resource),
        setMoveTargetFromBlackboard(),
        moveToTarget(),
        withdrawResources()
    )
}
