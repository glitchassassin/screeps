import { travel } from "TaskRequests/activity/Travel";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";

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
        return [ ]
    }
    message = "🕵";

    destination: string|null = null;

    constructor(
        destination: string|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[ExploreTask: ${this.destination}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        if (creep.pos.roomName === this.destination) return TaskActionResult.SUCCESS;

        let result = travel(creep, new RoomPosition(25, 25, this.destination))

        if (result !== OK) {
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.INPROGRESS;
    }
    cost() {return 1;}; // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            pos: new RoomPosition(25, 25, this.destination || ''),
            output: 10 // Arbitrary amount of work
        }
    }
    valid() {
        return !!this.destination;
    }
}
