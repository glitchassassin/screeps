import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { MustHaveEnergyFromSource } from "TaskRequests/prereqs/MustHaveEnergyFromSource";
import { MustHaveNoWorkParts } from "TaskRequests/prereqs/MustHaveNoWorkParts";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction } from "TaskRequests/TaskAction";
import { transformGameObject } from "utils/transformGameObject";
import { TransferTask } from "./TransferTask";

export class ResupplyTask extends TransferTask {
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
            new MustHaveNoWorkParts(),
            new MustHaveEnergy(this.getCapacityFromDestination()),
            new MustBeAdjacent(this.destination),
        ]
    }
    toString() {
        return `[ResupplyTask: ${this.destination?.roomName}{${this.destination?.x},${this.destination?.y}}]`
    }
}
