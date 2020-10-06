import { Transform } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergyFromSource } from "TaskRequests/prereqs/MustHaveEnergyFromSource";
import { MustHaveNoWorkParts } from "TaskRequests/prereqs/MustHaveNoWorkParts";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { transformRoomPosition } from "utils/transformGameObject";

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
            new MustHaveEnergyFromSource(this.amount),
            new MustBeAdjacent(this.destination, 1),
        ]
    }
    message = "⏩";

    @Transform(transformRoomPosition)
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
        if (!this.destination) return TaskActionResult.FAILED;

        // Times out after `n` ticks, if not emptied sooner
        if (!this.timeout) this.timeout = Game.time + 200
        if (Game.time > this.timeout) {
            creep.memory.depot = false;
            return TaskActionResult.FAILED;
        }

        // Wait for minions to request resources
        creep.memory.depot = (creep.store.getUsedCapacity() !== 0);
        return (!creep.memory.depot) ? TaskActionResult.SUCCESS : TaskActionResult.INPROGRESS;
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
        return !!this.destination;
    }
}
