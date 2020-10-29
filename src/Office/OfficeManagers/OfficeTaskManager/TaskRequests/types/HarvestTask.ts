import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { CachedSource } from "WorldState/branches/WorldSources";
import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";

export class HarvestTask extends TaskAction {
    message = "⚡";

    constructor(
        public source: CachedSource,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[HarvestTask: ${this.source.pos?.roomName}{${this.source.pos?.x},${this.source.pos?.y}}]`
    }

    action(creep: CachedCreep) {
        // If unable to get the creep or source, task is completed
        if (!this.source || !this.source.franchisePos) return TaskActionResult.FAILED;
        if (creep.pos.roomName !== this.source.pos.roomName) {
            travel(creep, this.source.franchisePos);
            return TaskActionResult.INPROGRESS;
        }

        if (!creep.pos.isEqualTo(this.source.franchisePos) && this.source.pos.lookFor(LOOK_CREEPS).length === 0) {
            // Prefer the main franchise location
            travel(creep, this.source.franchisePos, 0);
            return TaskActionResult.INPROGRESS;
        } else if (!creep.pos.isNearTo(this.source.pos)) {
            travel(creep, this.source.pos, 1);
        }

        if (!this.source.gameObj) return TaskActionResult.FAILED;
        creep.gameObj.harvest(this.source.gameObj);

        return TaskActionResult.INPROGRESS;
    }

    canBeFulfilledBy(creep: CachedCreep) {
        return creep.gameObj.getActiveBodyparts(WORK) > 0 && creep.gameObj.getActiveBodyparts(MOVE) > 0 && creep.memory.source === this.source.id;
    }
}
