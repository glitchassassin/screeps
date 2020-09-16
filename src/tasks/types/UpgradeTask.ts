import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "tasks/prereqs/MustHaveEnergy";
import { SpeculativeMinion, Task } from "../Task";

export class UpgradeTask extends Task {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    prereqs = [
        MustBeAdjacent(() => this.destination?.pos),
        MustHaveEnergy(() => 1000) // No cap on upgrade energy
    ]
    message = "⏫";
    constructor(
        public creep: Creep|null = null,
        public destination: StructureController|null = null,
    ) { super() }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.destination) return true;

        let result = this.creep.upgradeController(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.destination);
        } else if (result === ERR_NOT_ENOUGH_ENERGY) {
            return true;
        }
        return false;
    }
    cost = (minion: SpeculativeMinion) => {
        // Approximate effectiveness of minion based on number of WORK parts
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
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
        this.destination = Game.getObjectById(task.destinationId as Id<StructureController>)
        return this;
    }
}
