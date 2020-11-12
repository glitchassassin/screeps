import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedController, CachedCreep } from "WorldState";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { MinionRequest } from "./MinionRequest";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";
import { upgradeController } from "BehaviorTree/behaviors/upgradeController";

export class UpgradeRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;
    public pos: RoomPosition;

    constructor(controller: CachedController) {
        super();
        this.pos = controller.pos;
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
                upgradeController(controller),
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
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(WORK) > 0 &&
            creep.gameObj.getActiveBodyparts(CARRY) > 0 &&
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
profiler.registerClass(UpgradeRequest, 'UpgradeRequest');
