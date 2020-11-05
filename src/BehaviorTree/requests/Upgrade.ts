import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedController, CachedCreep } from "WorldState";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { Request } from "BehaviorTree/Request";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import { upgradeController } from "BehaviorTree/behaviors/upgradeController";

export class UpgradeRequest extends Request<CachedCreep> {
    public action: Behavior<CachedCreep>;

    constructor(controller: CachedController) {
        super();
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
                setState(States.GET_ENERGY)
            )
        )
    }

    meetsCapacity(creeps: CachedCreep[]) {
        // Only need one to reserve a controller
        return (creeps.length > 0)
    }
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(WORK) > 0 &&
            creep.gameObj.getActiveBodyparts(CARRY) > 0 &&
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
