import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Route } from "WorldState/LogisticsRouteModel";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        logisticsRoute?: Route
        logisticsRouteIndex?: number
    }
}

export const setLogisticsRoute = (route: Route) => (creep: Creep, bb: Blackboard) => {
    bb.logisticsRoute = route;
    return BehaviorResult.SUCCESS;
}
export const resetLogisticsRoute = () => (creep: Creep, bb: Blackboard) => {
    bb.logisticsRouteIndex = 0;
    return BehaviorResult.SUCCESS;
}
export const incrementLogisticsRoute = () => (creep: Creep, bb: Blackboard) => {
    bb.logisticsRouteIndex = (bb.logisticsRouteIndex ?? 0) + 1;
    return BehaviorResult.SUCCESS;
}
