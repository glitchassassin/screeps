import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior"
import { States, setState } from "./states"

import { findLogisticsTarget } from "./findLogisticsTarget"
import { moveToTarget } from "./moveTo"
import { resetLogisticsRoute } from "./logisticsRoute"
import { withdrawResources } from "./withdrawResources"

export const withdrawFromLogisticsNode = (resource?: ResourceConstant) => {
    return (creep: Creep, bb: Blackboard) => {
        if (!bb.logisticsRoute || !bb.logisticsRouteIndex) return BehaviorResult.FAILURE
        let source = bb.logisticsRoute.sources[bb.logisticsRouteIndex].structure as AnyStoreStructure ??
                     bb.logisticsRoute.sources[bb.logisticsRouteIndex].pos
        if (!source) {
            return Sequence(
                resetLogisticsRoute(),
                setState(States.DEPOSIT),
                fail(),
            )(creep, bb)
        }
        return Sequence(
            findLogisticsTarget(source, resource),
            moveToTarget(),
            withdrawResources(resource),
        )(creep, bb)
    }
}
