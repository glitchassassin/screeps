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
    destination: Structure|Tombstone|Resource<RESOURCE_ENERGY>|null = null;
    constructor(
        destination: Structure|Tombstone|Resource<RESOURCE_ENERGY>|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[WithdrawTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination || !Game.getObjectById(this.destination.id as Id<any>)) return TaskActionResult.FAILED;
        let result;
        if (this.destination instanceof Resource) {
            result = creep.pickup(this.destination);
        } else {
            result = creep.withdraw(this.destination, RESOURCE_ENERGY);
        }
        return (result === OK) ? TaskActionResult.SUCCESS : TaskActionResult.FAILED;
    }
    cost() {
        // Takes one tick to withdraw, but here we
        // are weighting sources by preference
        if (this.destination instanceof Tombstone || this.destination instanceof Resource) {
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
        let targetCapacity;
        if (this.destination instanceof Resource) {
            targetCapacity = this.destination.amount;
        } else {
            targetCapacity = ((this.destination as AnyStoreStructure)?.store as GenericStore).getUsedCapacity(RESOURCE_ENERGY) || 0;
        }
        return {
            ...minion,
            capacityUsed: Math.min(minion.capacity, minion.capacityUsed + targetCapacity)
        }
    }
    valid() {
        if (this.destination instanceof Resource) {
            return this.destination.amount > 0;
        } else {
            return (((this.destination as AnyStoreStructure)?.store as GenericStore).getUsedCapacity(RESOURCE_ENERGY) || 0) > 0;
        }
    }
}
