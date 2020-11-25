import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { CachedController } from "WorldState/Controllers";
import { MinionRequest } from "./MinionRequest";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";
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
                stateIsEmpty(),
                setState(States.GET_ENERGY)
            ),
            Sequence(
                stateIs(States.GET_ENERGY),
                getEnergy(),
                setState(States.WORKING)
            ),
            Sequence(
                stateIs(States.WORKING),
                moveTo(controller.pos, 3),
                upgradeController(controller.id),
            ),
            Sequence(
                setState(States.GET_ENERGY)
            )
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
profiler.registerClass(UpgradeRequest, 'UpgradeRequest');
