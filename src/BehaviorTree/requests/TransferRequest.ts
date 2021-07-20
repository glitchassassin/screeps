import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { creepCapacityEmpty, creepCapacityFull, structureCapacityFull } from "BehaviorTree/behaviors/energyFull";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { Capacity } from "WorldState/Capacity";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { depositResources } from "BehaviorTree/behaviors/depositResources";
import { dropResources } from "BehaviorTree/behaviors/dropResources";
import { fail } from "BehaviorTree/behaviors/fail";
import { log } from "utils/logger";
import { noResourcesAvailable } from "BehaviorTree/behaviors/resourcesAvailable";
import profiler from "screeps-profiler";
import { withdrawFromLogisticsSource } from "BehaviorTree/behaviors/withdrawFromLogisticsSource";

export class TransferRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;

    constructor(public storage: PlannedStructure, public destination: PlannedStructure, public dropIfNotExists = false, public priority: number = 5, public resource?: ResourceConstant) {
        super();
        this.pos = destination.pos;
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
                        withdrawFromLogisticsSource(storage.pos, false, resource),
                        continueIndefinitely()
                    )
                )
            ),
            Sequence(
                stateIs(States.DEPOSIT),
                Selector(
                    Sequence(
                        Selector(
                            creepCapacityEmpty(resource),
                            structureCapacityFull(destination, resource),
                        ), // Done
                    ),
                    Sequence(
                        moveTo(destination.pos, (destination.structure || !dropIfNotExists) ? 1 : 0),
                        (destination.structure || !dropIfNotExists) ?
                            depositResources(destination.structure as AnyStoreStructure, resource) :
                            dropResources(resource),
                        continueIndefinitely()
                    )
                )
            ),
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    meetsCapacity(creeps: Creep[]) {
        const capacity = creeps.reduce((sum, c) => sum + c.getActiveBodyparts(CARRY), 0) * CARRY_CAPACITY;
        const sources = LogisticsAnalyst.countEnergyInContainersOrGround(this.pos, true);
        let destination = Capacity.byId(this.storage.structure?.id as Id<StructureStorage>, this.resource)?.free;
        if (destination === undefined && this.dropIfNotExists) {
            destination = CONTAINER_CAPACITY - LogisticsAnalyst.countEnergyInContainersOrGround(this.storage.pos, false)
        }
        const throughput = Math.min(sources, destination ?? 0);

        log('TransferRequest', `meetsCapacity (${creeps.length}) ${capacity} / ${throughput}`)
        return capacity >= throughput;
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

if (PROFILE.requests) profiler.registerClass(TransferRequest, 'TransferRequest');
