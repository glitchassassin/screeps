import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { creepCapacityEmpty, creepCapacityFull } from "BehaviorTree/behaviors/energyFull";

import { Capacity } from "WorldState/Capacity";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { MinionRequest } from "./MinionRequest";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { depositOrDrop } from "BehaviorTree/behaviors/depositOrDrop";
import { fail } from "BehaviorTree/behaviors/fail";
import { log } from "utils/logger";
import { noResourcesAvailable } from "BehaviorTree/behaviors/resourcesAvailable";
import { resetMoveTarget } from "BehaviorTree/behaviors/moveTo";
import { withdrawFromLogisticsSource } from "BehaviorTree/behaviors/withdrawFromLogisticsSource";

export class StorageRequest extends MinionRequest {
    public action: Behavior<Creep>;

    constructor(public pos: RoomPosition, public storage: PlannedStructure, public priority: number = 5, public resource?: ResourceConstant) {
        super();
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
                            noResourcesAvailable(pos, true)
                        ),
                        resetMoveTarget(),
                        setState(States.DEPOSIT),
                        continueIndefinitely()
                    ),
                    Sequence(
                        withdrawFromLogisticsSource(pos, true, resource),
                        continueIndefinitely()
                    )
                )
            ),
            Sequence(
                stateIs(States.DEPOSIT),
                Selector(
                    Sequence(
                        Selector(
                            creepCapacityEmpty(),
                        ), // Done
                    ),
                    Sequence(
                        depositOrDrop(storage, resource),
                        continueIndefinitely()
                    )
                )
            ),
        )
    }

    meetsCapacity(creeps: Creep[]) {
        const capacity = creeps.reduce((sum, c) => sum + c.getActiveBodyparts(CARRY), 0) * CARRY_CAPACITY;
        const sources = LogisticsAnalyst.countEnergyInContainersOrGround(this.pos, true);
        const destination = (
            Capacity.byId(this.storage.structure?.id as Id<StructureStorage>, this.resource)?.free ??
            (CONTAINER_CAPACITY - LogisticsAnalyst.countEnergyInContainersOrGround(this.storage.pos, false))
        );
        const throughput = Math.min(sources, destination);

        log('StorageRequest', `meetsCapacity (${creeps.length}) ${capacity} / ${throughput}`)
        return capacity >= throughput;
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}
