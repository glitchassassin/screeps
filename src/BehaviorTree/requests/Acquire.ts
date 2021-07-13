import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";

import { CachedController } from "WorldState/Controllers";
import { MinionRequest } from "./MinionRequest";
import { claimController } from "BehaviorTree/behaviors/claimController";
import { markController } from "BehaviorTree/behaviors/markController";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class AcquireRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public controllerId: Id<StructureController>;
    public minionType = 'LAWYER';

    constructor(public controller: CachedController) {
        super();
        this.pos = controller.pos;
        this.controllerId = controller.id;
        this.action = Selector(
            Sequence(
                markController(controller.id, 'This sector property of the Grey Company'),
                claimController(controller.id)
            ),
            moveTo(controller.pos),
        )
    }

    meetsCapacity(creeps: Creep[]) {
        // Only need one to reserve a controller
        return (creeps.length > 0)
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(CLAIM) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }
}
