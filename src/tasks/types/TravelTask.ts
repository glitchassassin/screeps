import { MustHavePath } from "tasks/prereqs/MustHavePath";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction } from "tasks/TaskAction";
import { Transform, TransformationType, Type } from "class-transformer";
import { transformGameObject, transformRoomPosition } from "utils/transformGameObject";

export class TravelTask extends TaskAction {
    // Prereq: Minion must have a path to destination
    //         Otherwise, fail this branch
    getPrereqs() {
        if (!this.destination) return [];
        return [new MustHavePath(this.destination)]
    }
    message = "🚗";

    // @Type(() => RoomPosition)
    @Transform(transformRoomPosition)
    destination: RoomPosition|null = null;

    distance: number;

    constructor(
        destination: RoomPosition|null = null,
        distance: number = 0
    ) {
        super();
        this.destination = destination;
        this.distance = distance;
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return true;

        creep.moveTo(this.destination);
        return creep.pos.inRangeTo(this.destination, this.distance);
    }
    cost(minion: SpeculativeMinion) {
        if (!this.destination) return Infinity
        return PathFinder.search(minion.pos, this.destination).cost;
    }
}
