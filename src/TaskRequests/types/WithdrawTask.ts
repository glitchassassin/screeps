import { withdraw } from "TaskRequests/activity/Withdraw";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveCarryCapacity } from "TaskRequests/prereqs/MustHaveCarryCapacity";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";

export class WithdrawTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have room to store energy
    //         Otherwise, fail
    getPrereqs() {
        if (!this.destination) return [];
        return [
            new MustHaveCarryCapacity(),
            new MustBeAdjacent(this.destination.pos),
        ]
    }
    message = "⏪";

    destination: Structure|Tombstone|Creep|Resource<RESOURCE_ENERGY>|null = null;
    constructor(
        destination: Structure|Tombstone|Creep|Resource<RESOURCE_ENERGY>|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[WithdrawTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination || !Game.getObjectById(this.destination.id as Id<any>)) return TaskActionResult.FAILED;

        let result = withdraw(creep, this.destination);

        return (result === OK) ? TaskActionResult.SUCCESS : TaskActionResult.FAILED;
    }
    cost() {
        // Takes one tick to withdraw, but here we
        // are weighting sources by preference
        if (this.destination instanceof Tombstone || this.destination instanceof Resource) {
            return -20;
        } else if (this.destination instanceof Creep) {
            return 0;
        }
        let store = ((this.destination as AnyStoreStructure).store as GenericStore);
        let capacity = store.getCapacity(RESOURCE_ENERGY);
        if (!capacity) return Infinity;

        switch (this.destination?.structureType) {
            case STRUCTURE_CONTAINER:
                // Full container = cost of -20
                // Empty container = cost of 20
                return ((store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) / capacity - 0.5) * -20;
            case STRUCTURE_SPAWN:
                return 1000;
            default:
                return 10;
        }
    }
    predict(minion: SpeculativeMinion) {
        let targetCapacity;
        if (this.destination instanceof Resource) {
            targetCapacity = this.destination.amount;
        } else {
            targetCapacity = ((this.destination as AnyStoreStructure)?.store as GenericStore).getUsedCapacity(RESOURCE_ENERGY) || 0;
        }
        return {
            ...minion,
            capacityUsed: Math.min(minion.capacity, minion.capacityUsed + targetCapacity)
        }
    }
    valid() {
        if (this.destination instanceof Resource) {
            return this.destination.amount > 0;
        } else {
            return (((this.destination as AnyStoreStructure)?.store as GenericStore).getUsedCapacity(RESOURCE_ENERGY) || 0) > 0;
        }
    }
}
