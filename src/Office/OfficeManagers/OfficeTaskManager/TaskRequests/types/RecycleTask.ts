import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { CachedStructure } from "WorldState";
import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";

export class RecycleTask extends TaskAction {
    message = "♲";
    capacity = 1000;

    constructor(
        public spawn: CachedStructure<StructureSpawn>,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[RecycleTask: ${this.spawn.pos.roomName}{${this.spawn.pos.x},${this.spawn.pos.y}}]`
    }

    action(creep: CachedCreep) {
        if (!this.spawn.gameObj) return TaskActionResult.FAILED;
        let result = this.spawn.gameObj.recycleCreep(creep.gameObj);
        if (result === ERR_NOT_IN_RANGE) {
            travel(creep, this.spawn.pos);
            return TaskActionResult.INPROGRESS;
        } else if (result !== OK) {
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.SUCCESS;
    }

    canBeFulfilledBy(creep: CachedCreep) {
        return creep.gameObj.getActiveBodyparts(MOVE) > 0;
    }
}
