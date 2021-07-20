import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

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
export const findLogisticsSource = (pos: RoomPosition, includeAdjacent = true, resource?: ResourceConstant) => (creep: Creep, bb: Blackboard) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    if (!bb.target || !byId(bb.target) || !bb.targetPos) {
        // Prefer sources that can fill the minion, even if they're further away
        let target = LogisticsAnalyst.getRealLogisticsSources(pos, includeAdjacent, resource).shift();

        if (!target) {
            log(creep.name, `findLogisticsSource: ${creep.pos} has no sources at pos ${pos}`)
        } else {
            bb.target = target.id;
            bb.targetPos = target.pos;
            log(creep.name, `findLogisticsSource: ${creep.pos} to ${byId(bb.target)} @ ${bb.targetPos} (range ${bb.targetPos?.getRangeTo(creep.pos)})`)
        }
    }
    return bb.target ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
