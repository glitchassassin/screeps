import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior"
import { findLogisticsTarget, resetTarget } from "./findLogisticsTarget"
import { moveToTarget, resetMoveTarget } from "./moveTo"

import { CachedStructure } from "WorldState/Structures"
import { depositResources } from "./depositResources"
import { dropResources } from "./dropResources"
import { getNextLogisticsRouteStep } from "./logisticsRoute"

export const depositAtLogisticsNode = (resource?: ResourceConstant) => {
    return (creep: Creep, bb: Blackboard) => {
        if (!bb.logisticsRoute || !bb.logisticsRouteIndex) return BehaviorResult.FAILURE
        let destination = bb.logisticsRoute.destinations[bb.logisticsRouteIndex - bb.logisticsRoute.sources.length]

        if (!destination) {
            return Sequence(
                getNextLogisticsRouteStep(),
                fail(),
            )(creep, bb)
        }
        return Sequence(
            findLogisticsTarget(destination, resource, true),
            moveToTarget(),
            (destination.structure || destination.structureType !== STRUCTURE_STORAGE) ?
                depositResources(destination.structure as CachedStructure<AnyStoreStructure>, resource) :
                dropResources(resource),
            resetTarget(),
            resetMoveTarget(),
        )(creep, bb)
    }
}
