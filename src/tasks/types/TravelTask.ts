import { Task } from "../Task";

export class TravelTask extends Task {
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
