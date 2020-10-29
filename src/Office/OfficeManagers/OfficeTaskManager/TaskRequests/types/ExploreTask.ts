import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";

export class ExploreTask extends TaskAction {
    message = "🕵";

    constructor(
        public destination: string,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[ExploreTask: ${this.destination}]`
    }

    action(creep: CachedCreep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        if (creep.pos.roomName === this.destination) {
            this.done = true;
            return TaskActionResult.SUCCESS;
        }

        let result = travel(creep, new RoomPosition(25, 25, this.destination), 20)
        if (result !== OK) {
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.INPROGRESS;
    }

    canBeFulfilledBy(creep: CachedCreep) {
        return creep.gameObj.getActiveBodyparts(MOVE) > 0
    }
}
