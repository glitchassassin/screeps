import { Behavior, Sequence } from "BehaviorTree/Behavior";
import { CachedController, CachedCreep } from "WorldState";

import { MinionRequest } from "./MinionRequest";
import { markController } from "BehaviorTree/behaviors/markController";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import { reserveController } from "BehaviorTree/behaviors/reserveController";

export class ReserveRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;
    public pos: RoomPosition;

    constructor(controller: CachedController) {
        super();
        this.pos = controller.pos;
        this.action = Sequence(
            moveTo(controller.pos),
            markController(controller, 'This sector property of the Grey Company'),
            reserveController(controller)
        )
    }

    meetsCapacity(creeps: CachedCreep[]) {
        // Only need one to reserve a controller
        return (creeps.length > 0)
    }
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(CLAIM) > 0 &&
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
