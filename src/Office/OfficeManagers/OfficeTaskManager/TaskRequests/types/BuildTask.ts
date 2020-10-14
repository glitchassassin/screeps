import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { doWork } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/DoWork";
import { TaskActionResult } from "../TaskAction";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";

export class BuildTask extends GetEnergyAndWorkTask {
    message = "🔨";
    pos: RoomPosition;
    capacity = 4;

    constructor(
        public destination: CachedConstructionSite,
        public priority: number
    ) {
        super(priority);
        this.pos = destination.pos;
        this.capacity = this.destination.progressTotal - this.destination.progress;
    }
    toString() {
        return `[BuildTask: ${this.pos.roomName}{${this.pos.x},${this.pos.y}}]`
    }

    valid() {
        // If we can see the room and the site does not exist, return false
        return !(Game.rooms[this.destination.pos.roomName] && (!this.destination.gameObj || !(this.destination.gameObj instanceof ConstructionSite)))
    }

    work(creep: Creep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination?.gameObj) return ERR_NOT_FOUND;
            return creep.build(this.destination.gameObj);
        })
    }
}
