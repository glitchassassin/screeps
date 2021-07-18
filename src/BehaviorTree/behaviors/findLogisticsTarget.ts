import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedStructure } from "WorldState/Structures";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        target?: Id<Resource|AnyStoreStructure|Tombstone|Ruin|Creep>
        targetPos?: RoomPosition
    }
}

/**
 * @returns FAILURE if unable to get the office, or if no target is found; SUCCESS if a valid target is chosen
 */
export const findLogisticsTarget = (target: Resource|CachedStructure<AnyStoreStructure>|RoomPosition, resource?: ResourceConstant, deposit = false) => (creep: Creep, bb: Blackboard) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    if (!bb.targetPos) {
        if (target instanceof RoomPosition) {
            let source = LogisticsAnalyst.getRealLogisticsSources(target, true, resource).shift()
            if (!source) return BehaviorResult.FAILURE;
            bb.targetPos = source.pos;
            bb.moveRange = deposit ? 0 : 1;
            bb.target = source.id;
        } else {
            bb.targetPos = target.pos;
            bb.moveRange = 1;
            bb.target = target.id;
        }
        bb.movePos = bb.targetPos;
        log(creep.name, `findLogisticsTarget: ${creep.pos} to ${byId(bb.target)} @ ${bb.targetPos} (range ${bb.targetPos?.getRangeTo(creep.pos)})`)
    }
    return bb.targetPos ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
