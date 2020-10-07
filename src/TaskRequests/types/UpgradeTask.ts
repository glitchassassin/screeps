import { getEnergy } from "TaskRequests/activity/GetEnergy";
import { travel } from "TaskRequests/activity/Travel";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { SpeculativeMinion } from "../SpeculativeMinion";

enum UpgradeStates {
    GETTING_ENERGY = 'GETTING_ENERGY',
    UPGRADING = 'UPGRADING'
}

export class UpgradeTask extends TaskAction {
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
            new MustHaveWorkParts(),
        ]
    }
    message = "⏫";
    state = UpgradeStates.GETTING_ENERGY;

    destination: StructureController|null = null;

    constructor(
        destination: StructureController|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[UpgradeTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep): TaskActionResult {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;

        switch (this.state) {
            case UpgradeStates.UPGRADING: {
                if (creep.store.getUsedCapacity() === 0) {
                    this.state = UpgradeStates.GETTING_ENERGY;
                    return this.action(creep); // Switch to getting energy
                }

                let result = creep.upgradeController(this.destination);
                if (result === ERR_NOT_IN_RANGE) {
                    return (travel(creep, this.destination.pos, 3) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED;
                } else if (result !== OK) {
                    return TaskActionResult.FAILED;
                }
                return TaskActionResult.INPROGRESS;
            }
            case UpgradeStates.GETTING_ENERGY: {
                if (creep.store.getUsedCapacity() > 0) {
                    this.state = UpgradeStates.UPGRADING;
                    return this.action(creep); // Switch to upgrading
                }
                return (getEnergy(creep) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
            }
        }
    }
    cost(minion: SpeculativeMinion) {
        // Approximate effectiveness of minion based on number of WORK parts
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            capacityUsed: 0,
            output: minion.capacity
        }
    }
    valid() {
        return !!this.destination;
    }
}
