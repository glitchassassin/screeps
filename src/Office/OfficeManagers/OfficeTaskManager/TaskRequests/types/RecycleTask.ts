import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

export class RecycleTask extends TaskAction {
    message = "♲";
    capacity = 1000;

    constructor(
        public spawn: StructureSpawn,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[RecycleTask: ${this.spawn.pos.roomName}{${this.spawn.pos.x},${this.spawn.pos.y}}]`
    }

    action(creep: Creep) {
        let result = this.spawn.recycleCreep(creep);
        if (result === ERR_NOT_IN_RANGE) {
            travel(creep, this.spawn.pos);
            return TaskActionResult.INPROGRESS;
        } else if (result !== OK) {
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.SUCCESS;
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(MOVE) > 0;
    }
}
