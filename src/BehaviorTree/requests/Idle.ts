import { Behavior } from "BehaviorTree/Behavior";
import { MinionRequest } from "./MinionRequest";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class IdleRequest extends MinionRequest {
    public action: Behavior<Creep>;

    constructor(public pos: RoomPosition) {
        super();
        this.action = moveTo(pos, 3);
    }

    meetsCapacity(creeps: Creep[]) {
        // Only need one to reserve a controller
        return (creeps.length > 0)
    }
    canBeFulfilledBy(creep: Creep) {
        return (creep.getActiveBodyparts(MOVE) > 0)
    }

}

// profiler.registerClass(IdleRequest, 'IdleRequest');
