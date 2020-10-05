import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { transformGameObject, transformRoomPosition } from "utils/transformGameObject";

export class DropTask extends TaskAction {
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
            new MustHaveEnergy(this.amount),
            new MustBeAdjacent(this.destination, 1),
        ]
    }
    message = "⏩";

    @Transform(transformRoomPosition)
    destination: RoomPosition|null = null;

    constructor(
        destination: RoomPosition|null = null,
        public amount: number
    ) {
        super();
        this.destination = destination || null;
    }
    toString() {
        return `[DropTask: ${this.destination?.roomName}{${this.destination?.x},${this.destination?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;

        let result = creep.drop(RESOURCE_ENERGY, this.amount);
        return (result === OK) ? TaskActionResult.SUCCESS : TaskActionResult.FAILED;
    }
    cost() {return 1;}; // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            output: minion.capacityUsed,
            capacityUsed: 0
        }
    }
    valid() {
        return !!this.destination;
    }
}
