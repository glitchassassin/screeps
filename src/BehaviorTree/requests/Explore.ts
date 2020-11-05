import { Behavior, Selector } from "BehaviorTree/Behavior";
import { ifIsInRoom, moveTo } from "BehaviorTree/behaviors/moveTo";

import { CachedCreep } from "WorldState";
import { Request } from "BehaviorTree/Request";

export class ExploreRequest extends Request<CachedCreep> {
    public action: Behavior<CachedCreep>;

    constructor(roomName: string) {
        super();
        this.action = Selector(
            ifIsInRoom(roomName),
            moveTo(new RoomPosition(25, 25, roomName), 20)
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
