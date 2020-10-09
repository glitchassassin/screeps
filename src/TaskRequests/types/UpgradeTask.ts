import { doWork } from "TaskRequests/activity/DoWork";
import { TaskActionResult } from "TaskRequests/TaskAction";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";

export class UpgradeTask extends GetEnergyAndWorkTask {
    message = "⏫";

    constructor(
        public destination: StructureController,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[UpgradeTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    work(creep: Creep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination) return ERR_NOT_FOUND;
            return creep.upgradeController(this.destination);
        })
    }
}
