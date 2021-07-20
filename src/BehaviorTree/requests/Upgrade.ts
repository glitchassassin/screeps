import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { CachedController } from "WorldState/Controllers";
import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { creepCapacityEmpty } from "BehaviorTree/behaviors/energyFull";
import { fail } from "BehaviorTree/behaviors/fail";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";
import { upgradeController } from "BehaviorTree/behaviors/upgradeController";
import { withdrawFromLogisticsSource } from "BehaviorTree/behaviors/withdrawFromLogisticsSource";

export class UpgradeRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public controllerId: Id<StructureController>;

    constructor(controller: CachedController, container: PlannedStructure) {
        super();
        this.pos = controller.pos;
        this.controllerId = controller.id;
        this.action = Selector(
            Sequence(
                stateIs(States.GET_ENERGY),
                withdrawFromLogisticsSource(container.pos, false, RESOURCE_ENERGY),
                setState(States.WORKING),
                fail(), // Skip to next section
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
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
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

if (PROFILE.requests) profiler.registerClass(UpgradeRequest, 'UpgradeRequest');
