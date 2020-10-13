import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

export class IdleTask extends TaskAction {
    message = "Zzz";
    capacity = 1000;

    constructor(
        public pos: RoomPosition,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[HarvestTask: ${this.pos.roomName}{${this.pos.x},${this.pos.y}}]`
    }

    action(creep: Creep) {
        if (creep.pos.inRangeTo(this.pos, 2)) return TaskActionResult.SUCCESS;
        // If unable to get the creep or source, task is completed
        travel(creep, this.pos);
        return TaskActionResult.INPROGRESS;
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(MOVE) > 0;
    }
}
