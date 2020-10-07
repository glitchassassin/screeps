import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { MustHaveNoWorkParts } from "TaskRequests/prereqs/MustHaveNoWorkParts";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { log } from "utils/logger";

export class TransferTask extends TaskAction {
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
            new MustHaveEnergy(this.getCapacityFromDestination()),
            new MustBeAdjacent(this.destination),
        ]
    }
    message = "⏩";
    destination: RoomPosition|null = null;

    constructor(
        destination: Structure|Creep|null = null,
    ) {
        super();
        this.destination = destination?.pos || null;
    }
    toString() {
        return `[TransferTask: ${this.destination?.roomName}{${this.destination?.x},${this.destination?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        let target = this.destination.look().map(t => t.creep || t.structure).find(t => t)
        if (!target) log('TransferTask', `No target at destination`);
        if (!target) return TaskActionResult.FAILED;

        let result = creep.transfer(target, RESOURCE_ENERGY);
        if (result !== OK) log('TransferTask', `transfer: ${result}`);
        return (result === OK || result === ERR_FULL) ? TaskActionResult.SUCCESS : TaskActionResult.FAILED;
    }
    cost() {return 1;} // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        let targetCapacity = this.getCapacityFromDestination();

        return {
            ...minion,
            output: Math.min(minion.capacityUsed, targetCapacity),
            capacityUsed: Math.min(0, minion.capacityUsed - targetCapacity)
        }
    }
    valid() {
        return !!this.destination && this.getCapacityFromDestination() > 0;
    }

    getCapacityFromDestination() {
        let targetCapacity = 1000;
        if (this.destination?.roomName && Game.rooms[this.destination?.roomName]) {
            let target = this.destination.look().map(t => t.creep || (t.structure as AnyStoreStructure)).find(t => t?.store)
            targetCapacity = (target?.store as GenericStore).getFreeCapacity(RESOURCE_ENERGY) || 1000;
        }
        return targetCapacity;
    }
}
