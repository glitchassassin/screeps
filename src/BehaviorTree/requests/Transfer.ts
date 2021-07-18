import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { moveTo, moveToTarget, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { CachedStructure } from "WorldState/Structures";
import { MinionRequest } from "./MinionRequest";
import { depositResources } from "BehaviorTree/behaviors/depositResources";
import { dropResources } from "BehaviorTree/behaviors/dropResources";
import { findLogisticsTarget } from "BehaviorTree/behaviors/findLogisticsTarget";
import { logisticsTargetHasNoResources } from "BehaviorTree/behaviors/logisticsTargetHasNoResources";
import { withdrawResources } from "BehaviorTree/behaviors/withdrawResources";

export class TransferRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;

    constructor(public target: RoomPosition|Resource|CachedStructure<AnyStoreStructure>, destination: RoomPosition|CachedStructure<AnyStoreStructure>, public resource?: ResourceConstant) {
        super();
        this.pos = (destination instanceof RoomPosition) ? destination : destination.pos;
        this.action = Selector(
            Sequence(
                stateIsEmpty(),
                setState(States.WITHDRAW),
            ),
            Sequence(
                stateIs(States.WITHDRAW),
                findLogisticsTarget(target),
                moveToTarget(),
                withdrawResources(resource),
                setState(States.DEPOSIT),
                resetMoveTarget()
            ),
            Sequence(
                stateIs(States.DEPOSIT),
                moveTo((destination instanceof RoomPosition) ? destination : destination.pos),
                (destination instanceof RoomPosition) ?
                    dropResources(resource) :
                    depositResources(destination, resource),
                Selector(
                    logisticsTargetHasNoResources(),
                    setState(States.WITHDRAW),
                )
            ),
        )
    }

    meetsCapacity(creeps: Creep[]) {
        // We don't need to double up on transfer requests
        return creeps.length > 0
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

// profiler.registerClass(DropHarvestRequest, 'DropHarvestRequest');
