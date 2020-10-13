import { doWork } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/DoWork";
import { TaskActionResult } from "../TaskAction";
import { GetEnergyAndWorkTask } from "./GetEnergyAndWork";

const repairToMax = (structure: Structure) => {
    if (structure instanceof StructureWall || structure instanceof StructureRampart) {
        return Math.max(structure.hitsMax, 100000)
    }
    return structure.hitsMax;
}

export class RepairTask extends GetEnergyAndWorkTask {
    message = "🛠";
    pos: RoomPosition;
    id: Id<Structure>;
    capacity = 1000;

    public get destination() : Structure|null {
        if ((!this.pos || !this.id) || this.pos && !Game.rooms[this.pos.roomName]) {
            return null // Room not visible, or pos/id not set
        }
        return Game.getObjectById(this.id);
    }

    constructor(
        destination: Structure,
        public priority: number
    ) {
        super(priority);
        this.pos = destination.pos;
        this.id = destination.id;
    }
    toString() {
        return `[RepairTask: ${this.pos.roomName}{${this.pos.x},${this.pos.y}}]`
    }

    valid() {
        return !(this.destination && this.destination.hits === repairToMax(this.destination))
    }

    work(creep: Creep): TaskActionResult {
        return doWork(creep, this.pos, (creep) => {
            if (!this.destination) return ERR_NOT_FOUND;
            return creep.repair(this.destination);
        })
    }
}
