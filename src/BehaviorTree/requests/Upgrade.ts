import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { CachedController } from "WorldState/Controllers";
import { MinionRequest } from "./MinionRequest";
import { energyEmpty } from "BehaviorTree/behaviors/energyFull";
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
                setState(States.WORKING),
                resetMoveTarget()
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
                    energyEmpty()
                ),
                setState(States.GET_ENERGY)
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
