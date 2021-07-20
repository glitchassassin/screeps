import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";
import { setMoveTargetFromBlackboard } from "./moveTo";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        target?: Id<Resource|AnyStoreStructure|Tombstone|Ruin|Creep>
        targetPos?: RoomPosition
    }
}

/**
 * @returns FAILURE if unable to get the office, or if no target is found; SUCCESS if a valid target is chosen
 */
export const findLogisticsTarget = (target: PlannedStructure, resource?: ResourceConstant, deposit = false) => (creep: Creep, bb: Blackboard) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    let range = 1;
    if (!bb.targetPos ) {
        if (deposit) {
            bb.targetPos = target.pos;
            bb.target = target.structure?.id as Id<AnyStoreStructure> | undefined;
        } else {
            let sources = LogisticsAnalyst.getRealLogisticsSources(target.pos, (target.structureType !== STRUCTURE_STORAGE), resource);
            let source = sources.shift()
            if (!source) return BehaviorResult.FAILURE;
            bb.targetPos = source.pos;
            bb.target = source.id;
        }
    }
    log(creep.name, `findLogisticsTarget: ${creep.pos} to ${byId(bb.target)} @ ${bb.targetPos} (range ${bb.targetPos?.getRangeTo(creep.pos)})`)
    return setMoveTargetFromBlackboard(range)(creep, bb);
}

export const resetTarget = () => (creep: Creep, bb: Blackboard) => {
    bb.target = undefined;
    bb.targetPos = undefined;
    return BehaviorResult.SUCCESS;
}
