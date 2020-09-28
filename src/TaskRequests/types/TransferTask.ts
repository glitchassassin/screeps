import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
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
            new MustHaveEnergy((this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY)),
            new MustBeAdjacent(this.destination.pos),
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
    toString() {
        return `[TransferTask: ${this.destination?.id} {${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;

        let result = creep.transfer(this.destination, RESOURCE_ENERGY);
        return (result === OK) ? TaskActionResult.SUCCESS : TaskActionResult.FAILED;
    }
    cost() {return 1;}; // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        let targetCapacity = (this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY);
        return {
            ...minion,
            output: Math.min(minion.capacityUsed, targetCapacity),
            capacityUsed: Math.min(0, minion.capacityUsed - targetCapacity)
        }
    }
    valid() {
        return !!this.destination && (this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    }
}
