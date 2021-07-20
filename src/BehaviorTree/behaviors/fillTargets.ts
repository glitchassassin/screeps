import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior";
import { moveTo, resetMoveTarget } from "./moveTo";

import { Capacity } from "WorldState/Capacity";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { depositResources } from "./depositResources";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        lastFillTarget?: RoomPosition
    }
}

export const depositAtNextFillTarget = (targets: PlannedStructure[]) => (creep: Creep, bb: Blackboard) => {
    for (let target of targets) {
        if (!target.structure || !Capacity.byId(target.structureId as Id<AnyStoreStructure>, RESOURCE_ENERGY)?.free) continue;

        // Target exists and has free space
        if (bb.lastFillTarget && !bb.lastFillTarget.isEqualTo(target.pos)) {
            bb.lastFillTarget = target.pos;
            return Sequence(
                resetMoveTarget(),
                moveTo(target.pos),
                depositResources(target.structure as AnyStoreStructure, RESOURCE_ENERGY),
            )(creep, bb);
        } else {
            return Sequence(
               moveTo(target.pos),
               depositResources(target.structure as AnyStoreStructure, RESOURCE_ENERGY),
           )(creep, bb);
        }

    }
    return BehaviorResult.SUCCESS;
}

