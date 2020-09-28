import { Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveCarryCapacity } from "TaskRequests/prereqs/MustHaveCarryCapacity";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
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
            new MustHaveCarryCapacity(),
            new MustBeAdjacent(this.destination.pos),
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
    toString() {
        return `[WithdrawTask: ${this.destination?.id} {${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;

        let result = creep.withdraw(this.destination, RESOURCE_ENERGY);
        return (result === OK) ? TaskActionResult.SUCCESS : TaskActionResult.FAILED;
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
