import { Franchise } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

export class HarvestTask extends TaskAction {
    message = "⚡";

    constructor(
        public franchise: Franchise,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[HarvestTask: ${this.franchise.pos?.roomName}{${this.franchise.pos?.x},${this.franchise.pos?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.franchise) return TaskActionResult.FAILED;
        if (creep.pos.roomName !== this.franchise.pos.roomName) {
            travel(creep, this.franchise.pos);
            return TaskActionResult.INPROGRESS;
        }

        if (!creep.pos.isEqualTo(this.franchise.pos) && this.franchise.pos.lookFor(LOOK_CREEPS).length === 0) {
            // Prefer the main franchise location
            travel(creep, this.franchise.pos, 0);
            return TaskActionResult.INPROGRESS;
        } else if (!creep.pos.isNearTo(this.franchise.sourcePos)) {
            travel(creep, this.franchise.sourcePos, 1);
        }

        if (!this.franchise.source) return TaskActionResult.FAILED;
        creep.harvest(this.franchise.source);

        return TaskActionResult.INPROGRESS;
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(MOVE) > 0 && creep.memory.source === this.franchise.id;
    }
}
