import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "tasks/prereqs/MustHaveEnergy";
import { Task } from "../Task";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction } from "tasks/TaskAction";
import { Transform, TransformationType, Type } from "class-transformer";
import { transformGameObject } from "utils/transformGameObject";

export class UpgradeTask extends TaskAction {
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
            new MustBeAdjacent(this.destination.pos),
            new MustHaveEnergy(1000) // No cap on upgrade energy
        ]
    }
    message = "⏫";

    @Type(() => StructureController)
    @Transform(transformGameObject(StructureController))
    destination: StructureController|null = null;

    constructor(
        destination: StructureController|null = null,
    ) {
        super();
        this.destination = destination;
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return true;

        let result = creep.upgradeController(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(this.destination);
        } else if (result === ERR_NOT_ENOUGH_ENERGY) {
            return true;
        }
        return false;
    }
    cost(minion: SpeculativeMinion) {
        // Approximate effectiveness of minion based on number of WORK parts
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
}
