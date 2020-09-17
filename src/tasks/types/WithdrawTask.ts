import * as ct from "class-transformer";
import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveCarryCapacity } from "tasks/prereqs/MustHaveCarryCapacity";
import { Task } from "../Task";

export class WithdrawTask extends Task {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have room to store energy
    //         Otherwise, fail
    getPrereqs = () => {
        if (!this.destination) return [];
        return [
            new MustBeAdjacent(this.destination.pos),
            new MustHaveCarryCapacity()
        ]
    }
    message = "⏪";

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
}
