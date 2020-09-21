import { Transform, TransformationType, Type } from "class-transformer";
import { MustHaveWorkParts } from "tasks/prereqs/MustHaveWorkParts";
import { transformGameObject } from "utils/transformGameObject";
import { MustBeAdjacent } from "../prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "../prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction } from "../TaskAction";

export class BuildTask extends TaskAction {
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
            new MustHaveWorkParts(),
            new MustHaveEnergy(this.destination.progressTotal - this.destination.progress),
            new MustBeAdjacent(this.destination.pos, 3),
        ]
    }
    message = "🔨";

    @Type(() => ConstructionSite)
    @Transform(transformGameObject(ConstructionSite))
    destination: ConstructionSite|null = null

    constructor(
        destination: ConstructionSite|null = null,
    ) {
        super();
        this.destination = destination;
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return true;

        let result = creep.build(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(this.destination);
        } else if (result !== OK){
            return true;
        }
        return false;
    }
    /**
     * Calculates cost based on the effectiveness of the minion
     * @param minion
     */
    cost(minion: SpeculativeMinion) {
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        let targetCapacity = (this.destination as ConstructionSite).progressTotal - (this.destination as ConstructionSite).progress;
        return {
            ...minion,
            output: Math.min(minion.capacityUsed, targetCapacity),
            capacityUsed: Math.max(0, minion.capacityUsed - targetCapacity)
        }
    }
    valid() {
        return !!this.destination;
    }
}
