import { Transform, TransformationType, Type } from "class-transformer";
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

    @Type(() => StructureController)
    @Transform((value, obj, type) => {
        switch(type) {
            case TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<StructureController>);
            case TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case TransformationType.CLASS_TO_CLASS:
                return obj;
        }
    })
    destination: StructureController|null = null;

    constructor(
        creep: Creep|null = null,
        destination: StructureController|null = null,
    ) {
        super(creep);
        this.destination = destination;
    }

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
}
