import { Behavior } from "BehaviorTree/Behavior";
import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";

export class IdleRequest extends MinionRequest {
    public action: Behavior<Creep>;

    constructor(public pos: RoomPosition) {
        super();
        this.action = moveTo(pos, 3);
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    meetsCapacity(creeps: Creep[]) {
        // Only need one to reserve a controller
        return (creeps.length > 0)
    }
    canBeFulfilledBy(creep: Creep) {
        return (creep.getActiveBodyparts(MOVE) > 0)
    }

}

if (PROFILE.requests) profiler.registerClass(IdleRequest, 'IdleRequest');
