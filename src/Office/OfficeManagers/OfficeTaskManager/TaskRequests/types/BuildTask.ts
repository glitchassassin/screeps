import { CachedConstructionSite } from "WorldState/branches/WorldConstructionSites";
import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";
import { TaskActionResult } from "../TaskAction";
import { doWork } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/DoWork";

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
        this.capacity = (this.destination.progressTotal ?? 0) - (this.destination.progress ?? 0);
    }
    toString() {
        return `[BuildTask: ${this.pos.roomName}{${this.pos.x},${this.pos.y}}]`
    }

    valid() {
        // If we can see the room and the site does not exist, return false
        return !(Game.rooms[this.destination.pos.roomName] && (!this.destination.gameObj || !(this.destination.gameObj instanceof ConstructionSite)))
    }

    work(creep: CachedCreep): TaskActionResult {
        return doWork(creep, this.destination.pos, (creep) => {
            if (!this.destination?.gameObj) return ERR_NOT_FOUND;
            return creep.gameObj.build(this.destination.gameObj);
        })
    }
}
