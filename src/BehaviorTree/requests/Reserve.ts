import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";

import { CachedController } from "WorldState/Controllers";
import { MinionRequest } from "./MinionRequest";
import { markController } from "BehaviorTree/behaviors/markController";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import { reserveController } from "BehaviorTree/behaviors/reserveController";

export class ReserveRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public controllerId: Id<StructureController>;

    constructor(controller: CachedController) {
        super();
        this.pos = controller.pos;
        this.controllerId = controller.id;
        this.action = Selector(
            Sequence(
                markController(controller.id, 'This sector property of the Grey Company'),
                reserveController(controller.id)
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
// profiler.registerClass(ReserveRequest, 'ReserveRequest');
