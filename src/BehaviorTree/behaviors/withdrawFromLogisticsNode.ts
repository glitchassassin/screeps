import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior"
import { States, setState } from "./states"
import { findLogisticsTarget, resetTarget } from "./findLogisticsTarget"
import { moveToTarget, resetMoveTarget } from "./moveTo"

import { log } from "utils/logger"
import { resetLogisticsRoute } from "./logisticsRoute"
import { withdrawResources } from "./withdrawResources"

export const withdrawFromLogisticsNode = (resource?: ResourceConstant) => {
    return (creep: Creep, bb: Blackboard) => {
        if (!bb.logisticsRoute || bb.logisticsRouteIndex === undefined) return BehaviorResult.FAILURE
        let source = bb.logisticsRoute.sources[bb.logisticsRouteIndex]
        log(creep.name, `withdrawFromLogisticsNode: ${source}`)
        if (!source) {
            return Sequence(
                resetLogisticsRoute(),
                resetMoveTarget(),
                setState(States.DEPOSIT),
                fail(),
            )(creep, bb)
        }
        return Sequence(
            findLogisticsTarget(source, resource),
            moveToTarget(),
            withdrawResources(resource),
            resetTarget(),
            resetMoveTarget(),
        )(creep, bb)
    }
}
