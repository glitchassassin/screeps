import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
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

    timeout?: number;

    constructor(
        public destination: RoomPosition,
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
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        if (creep.store.getUsedCapacity() > 0) {
            logisticsAnalyst.reportDepot(creep);
            return TaskActionResult.INPROGRESS;
        }
        return TaskActionResult.SUCCESS;
    }
    cost() {return 1;} // Takes one tick to transfer
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
