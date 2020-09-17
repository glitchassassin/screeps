import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "tasks/prereqs/MustHaveEnergy";
import { TaskAction } from "tasks/TaskAction";
import { transformGameObject } from "utils/transformGameObject";

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
            new MustBeAdjacent(this.destination.pos),
            new MustHaveEnergy((this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY))
        ]
    }
    message = "⏩";

    @Type(() => Structure)
    @Transform(transformGameObject(Structure))
    destination: Structure|null = null;

    constructor(
        destination: Structure|null = null,
    ) {
        super();
        this.destination = destination;
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return true;

        let result = creep.transfer(this.destination, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(this.destination);
        } else {
            return true;
        }
        return false;
    }
    cost() {return 1;}; // Takes one tick to transfer
}
