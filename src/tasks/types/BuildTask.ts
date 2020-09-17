import { Transform, Type } from "class-transformer";
import { TransformationType } from "class-transformer/enums";
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
        MustHaveEnergy(() => this.destination ? this.destination.progressTotal - this.destination.progress : undefined),
        MustBeAdjacent(() => this.destination?.pos),
    ]
    message = "🔨";

    @Type(() => ConstructionSite)
    @Transform((value, obj, type) => {
        switch(type) {
            case TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<ConstructionSite>);
            case TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case TransformationType.CLASS_TO_CLASS:
                return obj;
        }
    })
    destination: ConstructionSite|null = null

    constructor(
        creep: Creep|null = null,
        destination: ConstructionSite|null = null,
    ) {
        super(creep);
        this.destination = destination;
    }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.destination) return true;

        let result = this.creep.build(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.destination);
        } else if (result !== OK){
            console.log(`[BuildTask] Error: ${result}`);
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
}
