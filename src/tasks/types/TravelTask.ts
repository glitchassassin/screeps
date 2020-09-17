import * as ct from "class-transformer";
import { MustHavePath } from "tasks/prereqs/MustHavePath";
import { SpeculativeMinion, Task } from "../Task";

export class TravelTask extends Task {
    // Prereq: Minion must have a path to destination
    //         Otherwise, fail this branch
    getPrereqs = () => {
        if (!this.destination) return [];
        return [new MustHavePath(this.destination)]
    }
    message = "🚗";

    @ct.Type(() => RoomPosition)
    @ct.Transform((value, obj, type) => {
        switch(type) {
            case ct.TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<RoomPosition>);
            case ct.TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case ct.TransformationType.CLASS_TO_CLASS:
                return obj;
        }
    })
    destination: RoomPosition|null = null;

    constructor(
        creep: Creep|null = null,
        destination: RoomPosition|null = null,
    ) {
        super(creep);
        this.destination = destination;
    }

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
}
