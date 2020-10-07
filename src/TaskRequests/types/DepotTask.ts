import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { MustHaveNoWorkParts } from "TaskRequests/prereqs/MustHaveNoWorkParts";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { log } from "utils/logger";

export class DepotTask extends TaskAction {
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
            new MustHaveNoWorkParts(),
            new MustHaveEnergy(this.amount),
            new MustBeAdjacent(this.destination, 1),
        ]
    }
    message = "⏩";
    destination: RoomPosition|null = null;

    timeout?: number;

    constructor(
        destination: RoomPosition|null = null,
        public amount: number
    ) {
        super();
        this.destination = destination || null;
    }
    toString() {
        return `[DepotTask: ${this.destination?.roomName}{${this.destination?.x},${this.destination?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        log('DepotTask', `location: ${this.destination}`);
        if (!this.destination) return TaskActionResult.FAILED;

        // Wait for minions to request resources
        creep.memory.depot = (creep.store.getUsedCapacity() !== 0);
        log('DepotTask', `isDepot: ${creep.memory.depot}`);
        return (!creep.memory.depot) ? TaskActionResult.SUCCESS : TaskActionResult.INPROGRESS;
    }
    cancel(creep: Creep) {
        creep.memory.depot = false;
    }
    cost() {return 1;}; // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            output: minion.capacityUsed,
            capacityUsed: 0
        }
    }
    valid() {
        log('DepotTask', `valid? location: ${this.destination} ${!!this.destination}`);
        return !!this.destination;
    }
}
