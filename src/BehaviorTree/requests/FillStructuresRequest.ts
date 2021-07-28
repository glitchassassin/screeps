import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { creepCapacityEmpty, creepCapacityFull } from "BehaviorTree/behaviors/energyFull";

import { Capacity } from "WorldState/Capacity";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { LogisticsRouteData } from "WorldState/LogisticsRoutes";
import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { depositAtNextFillTarget } from "BehaviorTree/behaviors/fillTargets";
import { fail } from "BehaviorTree/behaviors/fail";
import { log } from "utils/logger";
import { noResourcesAvailable } from "BehaviorTree/behaviors/resourcesAvailable";
import profiler from "screeps-profiler";
import { resetMoveTarget } from "BehaviorTree/behaviors/moveTo";
import { withdrawFromLogisticsSource } from "BehaviorTree/behaviors/withdrawFromLogisticsSource";

export class FillStructuresRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;

    constructor(public storage: PlannedStructure, public roomName: string, public route: "extensionsAndSpawns"|"towers", public priority: number = 5) {
        super();
        this.pos = storage.pos;
        this.action = Selector(
            Sequence(
                stateIsEmpty(),
                setState(States.WITHDRAW),
                fail() // drop to next block
            ),
            Sequence(
                stateIs(States.WITHDRAW),
                Selector(
                    Sequence(
                        Selector(
                            creepCapacityFull(),
                            noResourcesAvailable(storage.pos, false)
                        ),
                        resetMoveTarget(),
                        setState(States.DEPOSIT),
                        continueIndefinitely()
                    ),
                    Sequence(
                        withdrawFromLogisticsSource(storage.pos, false, RESOURCE_ENERGY),
                        continueIndefinitely()
                    )
                )
            ),
            Sequence(
                stateIs(States.DEPOSIT),
                Selector(
                    creepCapacityEmpty(RESOURCE_ENERGY), // Done
                    Sequence(
                        depositAtNextFillTarget(roomName, route)
                    )
                )
            ),
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    destinationsCapacity() {
        return LogisticsRouteData.byRoom(this.roomName)?.office?.[this.route].destinations
            .reduce((sum, d) => sum + (Capacity.byId(d.structureId as Id<AnyStoreStructure>, RESOURCE_ENERGY)?.free ?? 0), 0) ?? 0
    }

    meetsCapacity(creeps: Creep[]) {
        const capacity = creeps.reduce((sum, c) => sum + c.getActiveBodyparts(CARRY), 0) * CARRY_CAPACITY;
        const sources = LogisticsAnalyst.countEnergyInContainersOrGround(this.storage.pos, true, RESOURCE_ENERGY);
        const destinations = this.destinationsCapacity();
        const throughput = Math.min(sources, destinations);

        log('FillStructuresRequest', `meetsCapacity (${creeps.length}) ${capacity} / ${throughput}`)
        return capacity >= throughput;
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

if (PROFILE.requests) profiler.registerClass(FillStructuresRequest, 'FillStructuresRequest');
