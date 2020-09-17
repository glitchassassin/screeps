import * as ct from "class-transformer";
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
    getPrereqs = () => {
        if (!this.destination) return [];
        return [
            new MustBeAdjacent(this.destination.pos),
            new MustHaveEnergy((this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY))
        ]
    }
    message = "⏩";

    @ct.Type(() => Structure)
    @ct.Transform((value, obj, type) => {
        switch(type) {
            case ct.TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<Structure>);
            case ct.TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case ct.TransformationType.CLASS_TO_CLASS:
                return obj;
        }
    })
    destination: Structure|null = null;

    constructor(
        creep: Creep|null = null,
        destination: Structure|null = null,
    ) {
        super(creep);
        this.destination = destination;
    }

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
}
