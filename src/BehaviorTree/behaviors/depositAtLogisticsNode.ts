import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior"
import { States, setState } from "./states"

import { depositResources } from "./depositResources"
import { dropResources } from "./dropResources"
import { findLogisticsTarget } from "./findLogisticsTarget"
import { moveToTarget } from "./moveTo"
import { resetLogisticsRoute } from "./logisticsRoute"

export const depositAtLogisticsNode = (resource?: ResourceConstant) => {
    return (creep: Creep, bb: Blackboard) => {
        if (!bb.logisticsRoute || !bb.logisticsRouteIndex) return BehaviorResult.FAILURE
        let destination = bb.logisticsRoute.destinations[bb.logisticsRouteIndex].structure as AnyStoreStructure ??
                          bb.logisticsRoute.destinations[bb.logisticsRouteIndex].pos
        if (!destination) {
            return Sequence(
                resetLogisticsRoute(),
                setState(States.WITHDRAW),
                fail(),
            )(creep, bb)
        }
        return Sequence(
            findLogisticsTarget(destination, resource, true),
            moveToTarget(),
            (destination instanceof RoomPosition) ?
                dropResources(resource) :
                depositResources(destination, resource),
        )(creep, bb)
    }
}
