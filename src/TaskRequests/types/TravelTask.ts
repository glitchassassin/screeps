import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { travel } from "TaskRequests/activity/Travel";

export class TravelTask extends TaskAction {
    // Prereq: Minion must have a path to destination
    //         Otherwise, fail this branch
    getPrereqs() {
        if (!this.destination) return [];
        return []; // [new MustHavePath(this.destination)]
    }
    message = "🚗";

    // @Type(() => RoomPosition)
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
    toString() {
        return `[TravelTask: ${this.distance} of ${this.destination?.roomName}{${this.destination?.x},${this.destination?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        if (creep.pos.inRangeTo(this.destination, this.distance)) return TaskActionResult.SUCCESS ;

        let result = travel(creep, this.destination, this.distance)

        if (result !== OK) {
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.INPROGRESS;
    }
    cost(minion: SpeculativeMinion) {
        if (!this.destination) return Infinity
        // Gets approximate cost by range instead of calculating the exact cost. This is faster
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        return mapAnalyst.getRangeTo(minion.pos, this.destination); //PathFinder.search(minion.pos, this.destination).cost;
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            pos: this.destination || minion.pos
        }
    }
    valid() {
        return !!this.destination;
    }
}
