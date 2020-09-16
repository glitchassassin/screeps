import { MustHavePath } from "tasks/prereqs/MustHavePath";
import { SpeculativeMinion, Task, TaskPrerequisite } from "../Task";

export class TravelTask extends Task {
    // Prereq: Minion must have a path to destination
    //         Otherwise, fail this branch
    prereqs = [
        MustHavePath(() => this.destination || undefined)
    ]
    message = "🚗";
    constructor(
        public creep: Creep|null = null,
        public destination: RoomPosition|null = null,
    ) { super(); }

    action = () => {
        // If unable to get the creep or destination, task is completed
        if (!this.creep || !this.destination) return true;

        this.creep.moveTo(this.destination);
        return this.creep.pos.isEqualTo(this.destination);
    }
    cost = (minion: SpeculativeMinion) => {
        if (!this.destination) return Infinity
        return PathFinder.search(minion.pos, this.destination).cost;
    }

    serialize = () => {
        return JSON.stringify({
            taskType: this.constructor.name,
            creepId: this.creep?.id,
            x: this.destination?.x,
            y: this.destination?.y,
            roomName: this.destination?.roomName
        })
    }
    deserialize = (task: any) => {
        this.creep = Game.getObjectById(task.creepId as Id<Creep>)
        this.destination = Game.rooms[task.roomName].getPositionAt(task.x, task.y);
        return this;
    }
}