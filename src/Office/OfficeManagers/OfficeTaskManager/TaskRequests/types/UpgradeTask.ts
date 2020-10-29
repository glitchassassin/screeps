import { CachedController } from "WorldState";
import { CachedCreep } from "WorldState/branches/WorldCreeps";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";
import { TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";
import { doWork } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/DoWork";

export class UpgradeTask extends GetEnergyAndWorkTask {
    message = "⏫";
    capacity = 1000;

    constructor(
        public destination: CachedController,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[UpgradeTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    work(creep: CachedCreep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination.gameObj) return ERR_NOT_FOUND;
            return creep.gameObj.upgradeController(this.destination.gameObj);
        })
    }
}
