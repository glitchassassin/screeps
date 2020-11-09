import { Behavior } from "BehaviorTree/Behavior";
import { CachedCreep } from "WorldState";
import { MinionRequest } from "./MinionRequest";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class IdleRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;

    constructor(public pos: RoomPosition) {
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
