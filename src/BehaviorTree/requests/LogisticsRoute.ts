import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { incrementLogisticsRoute, resetLogisticsRoute, setLogisticsRoute } from "BehaviorTree/behaviors/logisticsRoute";

import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { MinionRequest } from "./MinionRequest";
import type { Route } from "WorldState/LogisticsRouteModel";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { depositAtLogisticsNode } from "BehaviorTree/behaviors/depositAtLogisticsNode";
import { withdrawFromLogisticsNode } from "BehaviorTree/behaviors/withdrawFromLogisticsNode";

export class LogisticsRouteRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;

    constructor(public name: string, public route: Route, resource?: ResourceConstant) {
        super();
        let dest = route.destinations[0];
        this.pos = dest instanceof RoomPosition ? dest : dest.pos;
        this.action = Sequence(
            setLogisticsRoute(route),
            Selector(
                Sequence(
                    stateIsEmpty(),
                    resetLogisticsRoute(),
                    setState(States.WITHDRAW),
                ),
                Sequence(
                    stateIs(States.WITHDRAW),
                    withdrawFromLogisticsNode(resource),
                    incrementLogisticsRoute(),
                ),
                Sequence(
                    stateIs(States.DEPOSIT),
                    depositAtLogisticsNode(resource),
                    incrementLogisticsRoute(),
                ),
                continueIndefinitely(),
            )
        )
    }

    meetsCapacity(creeps: Creep[]) {
        const capacity = creeps.reduce((sum, c) => sum + c.getActiveBodyparts(CARRY), 0) * CARRY_CAPACITY;
        return capacity >= LogisticsAnalyst.calculateRouteThroughput(this.route);
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}
