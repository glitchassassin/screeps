import { Behavior } from "BehaviorTree/Behavior";
import { CachedCreep } from "WorldState";
import { Request } from "BehaviorTree/Request";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class IdleRequest extends Request<CachedCreep> {
    public action: Behavior<CachedCreep>;

    constructor(pos: RoomPosition) {
        super();
        this.action = moveTo(pos, 3);
    }

    meetsCapacity(creeps: CachedCreep[]) {
        // Only need one to reserve a controller
        return (creeps.length > 0)
    }
    canBeFulfilledBy(creep: CachedCreep) {
        return (creep.gameObj.getActiveBodyparts(MOVE) > 0)
    }

}
