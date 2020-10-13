import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

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

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        if (creep.pos.roomName === this.destination) return TaskActionResult.SUCCESS;

        let result = travel(creep, new RoomPosition(25, 25, this.destination))

        if (result !== OK) {
            console.log('explore failed', result);
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.INPROGRESS;
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(MOVE) > 0
    }
}
