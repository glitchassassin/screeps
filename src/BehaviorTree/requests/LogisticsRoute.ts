import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { checkIfLogisticsRouteIsDone, getNextLogisticsRouteStep, setLogisticsRoute } from "BehaviorTree/behaviors/logisticsRoute";

import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import type { Route } from "WorldState/LogisticsRouteModel";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { depositAtLogisticsNode } from "BehaviorTree/behaviors/depositAtLogisticsNode";
import { log } from "utils/logger";
import profiler from "screeps-profiler";
import { withdrawFromLogisticsNode } from "BehaviorTree/behaviors/withdrawFromLogisticsNode";

export class LogisticsRouteRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;

    constructor(public name: string, public route: Route, public priority: number = 5, resource?: ResourceConstant) {
        super();
        let dest = route.destinations[0];
        this.pos = dest instanceof RoomPosition ? dest : dest.pos;
        this.action = Sequence(
            setLogisticsRoute(route, resource),
            Selector(
                Sequence(
                    stateIsEmpty(),
                    Selector(
                        checkIfLogisticsRouteIsDone(),
                        getNextLogisticsRouteStep(),
                    ),
                    continueIndefinitely(),
                ),
                Sequence(
                    stateIs(States.WITHDRAW),
                    withdrawFromLogisticsNode(resource),
                    Selector(
                        checkIfLogisticsRouteIsDone(),
                        getNextLogisticsRouteStep(),
                    ),
                    continueIndefinitely(),
                ),
                Sequence(
                    stateIs(States.DEPOSIT),
                    depositAtLogisticsNode(resource),
                    Selector(
                        checkIfLogisticsRouteIsDone(),
                        getNextLogisticsRouteStep(),
                    ),
                    continueIndefinitely(),
                ),
                stateIs(States.DONE), // end
            )
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    meetsCapacity(creeps: Creep[]) {
        const capacity = creeps.reduce((sum, c) => sum + c.getActiveBodyparts(CARRY), 0) * CARRY_CAPACITY;
        const throughput = LogisticsAnalyst.calculateRouteThroughput(this.route);
        log('LogisticsRouteRequest', `meetsCapacity (${creeps.length}) ${capacity} / ${throughput}`)
        return capacity >= throughput;
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

if (PROFILE.requests) profiler.registerClass(LogisticsRouteRequest, 'LogisticsRouteRequest');
