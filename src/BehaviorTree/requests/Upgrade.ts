import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { CachedController } from "WorldState/Controllers";
import { MinionRequest } from "./MinionRequest";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { creepCapacityEmpty } from "BehaviorTree/behaviors/energyFull";
import { getEnergyNearby } from "BehaviorTree/behaviors/getEnergyNearby";
import { upgradeController } from "BehaviorTree/behaviors/upgradeController";

export class UpgradeRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public controllerId: Id<StructureController>;

    constructor(controller: CachedController) {
        super();
        this.pos = controller.pos;
        this.controllerId = controller.id;
        this.action = Selector(
            Sequence(
                stateIs(States.GET_ENERGY),
                getEnergyNearby(7),
                resetMoveTarget(),
                setState(States.WORKING),
                continueIndefinitely(),
            ),
            Sequence(
                stateIs(States.WORKING),
                Selector(
                    upgradeController(controller.id),
                    moveTo(controller.pos, 3),
                )
            ),
            Sequence(
                Selector(
                    stateIsEmpty(),
                    creepCapacityEmpty()
                ),
                setState(States.GET_ENERGY),
                continueIndefinitely(),
            ),
        )
    }

    meetsCapacity() {
        // Use as many upgraders as available
        return false;
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(WORK) > 0 &&
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}
// profiler.registerClass(UpgradeRequest, 'UpgradeRequest');
