import { Behavior, Selector } from "BehaviorTree/Behavior";
import { ifIsInRoom, moveTo } from "BehaviorTree/behaviors/moveTo";

import { CachedCreep } from "WorldState";
import { MinionRequest } from "./MinionRequest";

export class ExploreRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;
    public pos: RoomPosition;

    constructor(roomName: string) {
        super();
        this.pos = new RoomPosition(25, 25, roomName);
        this.action = Selector(
            ifIsInRoom(roomName),
            moveTo(this.pos, 20)
        )
    }

    // Assign any available minions to each build request
    meetsCapacity() { return false; }
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
