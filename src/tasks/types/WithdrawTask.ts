import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveCarryCapacity } from "tasks/prereqs/MustHaveCarryCapacity";
import { Task } from "../Task";

export class WithdrawTask extends Task {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have room to store energy
    //         Otherwise, fail
    prereqs = [
        MustBeAdjacent(() => this.destination?.pos),
        MustHaveCarryCapacity()
    ]
    message = "⏪";
    constructor(
        public creep: Creep|null = null,
        public destination: Structure|null = null,
    ) { super() }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.destination) return true;

        let result = this.creep.withdraw(this.destination, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.destination);
        } else {
            return true;
        }
        return false;
    }
    cost = () => {
        // Takes one tick to withdraw, but here we
        // are weighting sources by preference
        switch (this.destination?.structureType) {
            case STRUCTURE_CONTAINER:
                return 1;
            case STRUCTURE_SPAWN:
                return 1000;
            default:
                return 10;
        }
    }

    serialize = () => {
        return JSON.stringify({
            taskType: this.constructor.name,
            creepId: this.creep?.id,
            destinationId: this.destination?.id
        })
    }
    deserialize = (task: any) => {
        this.creep = Game.getObjectById(task.creepId as Id<Creep>)
        this.destination = Game.getObjectById(task.destinationId as Id<Structure>)
        return this;
    }
}
