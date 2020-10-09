import { travel } from "TaskRequests/activity/Travel";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";

export class HarvestTask extends TaskAction {
    message = "⚡";

    constructor(
        public source: RoomPosition,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[HarvestTask: ${this.source?.roomName}{${this.source?.x},${this.source?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.source) return TaskActionResult.FAILED;
        if (creep.pos.roomName !== this.source.roomName) {
            travel(creep, this.source);
            return TaskActionResult.INPROGRESS;
        }

        let source = this.source.lookFor(LOOK_SOURCES)?.[0]

        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            travel(creep, source.pos);
            return TaskActionResult.INPROGRESS;
        }
        if (creep.store.getCapacity() > 0) {
            // If can carry, is the creep full?
            if (creep.store.getFreeCapacity() == 0) {
                return TaskActionResult.SUCCESS;
            }
        }
        return TaskActionResult.INPROGRESS;
    }
}
