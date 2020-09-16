import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "tasks/prereqs/MustHaveEnergy";
import { Task, TaskPrerequisite } from "../Task";

export class TransferTask extends Task {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    prereqs = [
        MustBeAdjacent(() => this.destination?.pos),
        MustHaveEnergy(() => {
            if (!this.destination) return;
            return (this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY)
        })
    ]
    message = "⏩";
    constructor(
        public creep: Creep|null = null,
        public destination: Structure|null = null,
    ) { super() }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.destination) return true;

        let result = this.creep.transfer(this.destination, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.destination);
        } else {
            return true;
        }
        return false;
    }
    cost = () => 1; // Takes one tick to transfer

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
