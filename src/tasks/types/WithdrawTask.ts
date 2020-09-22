import { Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveCarryCapacity } from "tasks/prereqs/MustHaveCarryCapacity";
import { SpeculativeMinion } from "tasks/SpeculativeMinion";
import { TaskAction } from "tasks/TaskAction";
import { transformGameObject } from "utils/transformGameObject";

export class WithdrawTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have room to store energy
    //         Otherwise, fail
    getPrereqs() {
        if (!this.destination) return [];
        return [
            new MustBeAdjacent(this.destination.pos),
            new MustHaveCarryCapacity()
        ]
    }
    message = "⏪";

    @Type(() => Structure)
    @Transform(transformGameObject(Structure))
    destination: Structure|Tombstone|null = null;
    constructor(
        destination: Structure|Tombstone|null = null,
    ) {
        super();
        this.destination = destination;
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return true;

        let result = creep.withdraw(this.destination, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(this.destination);
        } else {
            return true;
        }
        return false;
    }
    cost() {
        // Takes one tick to withdraw, but here we
        // are weighting sources by preference
        if (this.destination instanceof Tombstone) {
            return 1;
        }
        switch (this.destination?.structureType) {
            case STRUCTURE_CONTAINER:
                return 1;
            case STRUCTURE_SPAWN:
                return 1000;
            default:
                return 10;
        }
    }
    predict(minion: SpeculativeMinion) {
        let targetCapacity = (this.destination as StructureContainer)?.store.getUsedCapacity(RESOURCE_ENERGY);
        return {
            ...minion,
            capacityUsed: Math.min(minion.capacity, minion.capacityUsed + targetCapacity)
        }
    }
    valid() {
        return !!this.destination;
    }
}
