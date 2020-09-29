import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { transformGameObject, transformRoomPosition } from "utils/transformGameObject";

export class ExploreTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    getPrereqs() {
        if (!this.destination) return [];
        return [
            new MustBeAdjacent(this.destination),
        ]
    }
    message = "⏩";

    @Transform(transformRoomPosition)
    destination: RoomPosition|null = null;

    constructor(
        destination: RoomPosition|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[ExploreTask: ${this.destination}]`
    }

    action(creep: Creep) {
        if (!this.destination) return TaskActionResult.FAILED;

        if (creep.room.name === this.destination.roomName)
            return TaskActionResult.SUCCESS;
        return TaskActionResult.FAILED;
    }
    cost() {return 1;}; // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            output: 10 // Arbitrary amount of work
        }
    }
    valid() {
        return !!this.destination;
    }
}
