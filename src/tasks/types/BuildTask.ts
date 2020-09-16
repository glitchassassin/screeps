import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "tasks/prereqs/MustHaveEnergy";
import { SpeculativeMinion, Task } from "../Task";

export class BuildTask extends Task {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    prereqs = [
        MustBeAdjacent(() => this.destination?.pos),
        MustHaveEnergy(() => this.destination ? this.destination.progressTotal - this.destination.progress : undefined)
    ]
    message = "🔨";
    constructor(
        public creep: Creep|null = null,
        public destination: ConstructionSite|null = null,
    ) { super() }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.destination) return true;

        let result = this.creep.build(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.destination);
        } else if (result !== OK){
            return true;
        }
        return false;
    }
    /**
     * Calculates cost based on the effectiveness of the minion
     * @param minion
     */
    cost = (minion: SpeculativeMinion) => {
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
        this.destination = Game.getObjectById(task.destinationId as Id<ConstructionSite>)
        return this;
    }
}
