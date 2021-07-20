import { Behavior, Selector } from "BehaviorTree/Behavior";
import { ifIsInRoom, moveTo } from "BehaviorTree/behaviors/moveTo";

import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import profiler from "screeps-profiler";

export class ExploreRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;

    constructor(public roomName: string) {
        super();
        this.pos = new RoomPosition(25, 25, roomName);
        this.action = Selector(
            ifIsInRoom(roomName),
            moveTo(this.pos, 5)
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    // Assign any available minions to each build request
    meetsCapacity(targets: Creep[]) { return targets.length > 0; }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

if (PROFILE.requests) profiler.registerClass(ExploreRequest, 'ExploreRequest');
