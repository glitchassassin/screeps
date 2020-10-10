import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { doWork } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/DoWork";
import { TaskActionResult } from "../TaskAction";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";

export class BuildTask extends GetEnergyAndWorkTask {
    message = "🔨";

    constructor(
        public destination: CachedConstructionSite,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[BuildTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    valid() {
        // If we can see the room and the site does not exist, return false
        return !(Game.rooms[this.destination.pos.roomName] && !this.destination.gameObj)
    }

    work(creep: Creep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination?.gameObj) return ERR_NOT_FOUND;
            return creep.build(this.destination.gameObj);
        })
    }
}
