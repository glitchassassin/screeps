import { MustHavePath } from "tasks/prereqs/MustHavePath";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction } from "tasks/TaskAction";
import { Transform, TransformationType, Type } from "class-transformer";

export class TravelTask extends TaskAction {
    // Prereq: Minion must have a path to destination
    //         Otherwise, fail this branch
    getPrereqs() {
        if (!this.destination) return [];
        return [new MustHavePath(this.destination)]
    }
    message = "🚗";

    @Type(() => RoomPosition)
    @Transform((value, obj, type) => {
        switch(type) {
            case TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<RoomPosition>);
            case TransformationType.CLASS_TO_PLAIN:
                return value.id;
            case TransformationType.CLASS_TO_CLASS:
                return value;
        }
    })
    destination: RoomPosition|null = null;

    constructor(
        destination: RoomPosition|null = null,
    ) {
        super();
        this.destination = destination;
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return true;

        creep.moveTo(this.destination);
        return creep.pos.isEqualTo(this.destination);
    }
    cost(minion: SpeculativeMinion) {
        if (!this.destination) return Infinity
        return PathFinder.search(minion.pos, this.destination).cost;
    }
}
