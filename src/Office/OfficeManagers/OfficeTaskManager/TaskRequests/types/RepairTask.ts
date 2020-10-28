import { CachedCreep } from "WorldState/branches/WorldCreeps";
import { CachedStructure } from "WorldState";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";
import { TaskActionResult } from "../TaskAction";
import { doWork } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/DoWork";

const repairToMax = (structure: CachedStructure) => {
    if (structure instanceof StructureWall || structure instanceof StructureRampart) {
        return Math.min(structure.hitsMax, 100000)
    }
    return structure.hitsMax;
}

export class RepairTask extends GetEnergyAndWorkTask {
    message = "🛠";
    capacity = 4;

    constructor(
        public destination: CachedStructure,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[RepairTask: ${this.destination.pos.roomName}{${this.destination.pos.x},${this.destination.pos.y}}]`
    }

    valid() {
        return !(this.destination && this.destination.hits === repairToMax(this.destination))
    }

    work(creep: CachedCreep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination.gameObj) return ERR_NOT_FOUND;
            return creep.gameObj.repair(this.destination.gameObj);
        })
    }
}
