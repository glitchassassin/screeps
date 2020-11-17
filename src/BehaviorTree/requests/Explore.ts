import { Behavior, Selector } from "BehaviorTree/Behavior";
import { ifIsInRoom, moveTo } from "BehaviorTree/behaviors/moveTo";

import { CachedCreep } from "WorldState";
import { MinionRequest } from "./MinionRequest";
import profiler from "screeps-profiler";

export class ExploreRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;
    public pos: RoomPosition;

    constructor(public roomName: string) {
        super();
        console.log('Exploring', roomName)
        this.pos = new RoomPosition(25, 25, roomName);
        this.action = Selector(
            ifIsInRoom(roomName),
            moveTo(this.pos, 5)
        )
    }

    // Assign any available minions to each build request
    meetsCapacity(targets: CachedCreep[]) { return targets.length > 0; }
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}

profiler.registerClass(ExploreRequest, 'ExploreRequest');
