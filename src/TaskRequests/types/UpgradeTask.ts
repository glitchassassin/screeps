import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { Task } from "../Task";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { Transform, TransformationType, Type } from "class-transformer";
import { transformGameObject } from "utils/transformGameObject";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";

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
            new MustHaveWorkParts(),
            new MustHaveEnergy(1000), // No cap on upgrade energy
            new MustBeAdjacent(this.destination.pos, 3),
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
    toString() {
        return `[UpgradeTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;

        let result = creep.upgradeController(this.destination);
        if (result === ERR_NOT_ENOUGH_ENERGY) {
            return TaskActionResult.SUCCESS;
        } else if (result !== OK) {
            return TaskActionResult.FAILED;
        }
        return TaskActionResult.INPROGRESS;
    }
    cost(minion: SpeculativeMinion) {
        // Approximate effectiveness of minion based on number of WORK parts
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            capacityUsed: 0,
            output: minion.capacity
        }
    }
    valid() {
        return !!this.destination;
    }
}
