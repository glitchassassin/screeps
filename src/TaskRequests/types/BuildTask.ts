import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { doWork } from "TaskRequests/activity/DoWork";
import { TaskActionResult } from "../TaskAction";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";

export class BuildTask extends GetEnergyAndWorkTask {
    message = "🔨";

    constructor(
        public destination: CachedConstructionSite
    ) {
        super();
    }
    toString() {
        return `[BuildTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    valid() {
        return (!!this.destination)
    }

    work(creep: Creep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination?.gameObj) return ERR_NOT_FOUND;
            return creep.build(this.destination.gameObj);
        })
    }
}
