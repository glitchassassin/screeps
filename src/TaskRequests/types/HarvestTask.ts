import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { travel } from "TaskRequests/activity/Travel";

export class HarvestTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the source
    getPrereqs() {
        if (!this.source) return [];
        return [
            new MustHaveWorkParts(),
        ]
    }
    message = "⚡";


    source: RoomPosition|null = null
    constructor(
        source: RoomPosition|null = null,
    ) {
        super();
        this.source = source;
    }
    toString() {
        return `[HarvestTask: ${this.source?.roomName}{${this.source?.x},${this.source?.y}}]`
    }

    action(creep: Creep) {
        if (creep.name === 'salesman53045') console.log(creep, this);
        // If unable to get the creep or source, task is completed
        if (!this.source) return TaskActionResult.FAILED;
        if (creep.pos.roomName !== this.source.roomName) {
            travel(creep, this.source);
            return TaskActionResult.INPROGRESS;
        }

        let source = this.source.lookFor(LOOK_SOURCES)?.[0]

        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            travel(creep, source.pos);
            return TaskActionResult.INPROGRESS;
        }
        if (creep.store.getCapacity() > 0) {
            // If can carry, is the creep full?
            if (creep.store.getFreeCapacity() == 0) {
                return TaskActionResult.SUCCESS;
            }
        }
        return TaskActionResult.INPROGRESS;
    }
    cost(minion: SpeculativeMinion) {
        // Approximate effectiveness of minion based on number of WORK parts
        // TODO: Adjust this to compare against the creep's capacity, or the
        //       local container, if applicable
        return 1/(minion.creep.getActiveBodyparts(WORK) * 2)
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            capacityUsed: minion.capacity,
        }
    }
    valid() {
        return !!this.source;
    }
}
