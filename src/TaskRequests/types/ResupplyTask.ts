import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { MustHaveEnergyFromSource } from "TaskRequests/prereqs/MustHaveEnergyFromSource";
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
            new MustHaveEnergyFromSource((this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY)),
            new MustBeAdjacent(this.destination.pos),
        ]
    }
    toString() {
        return `[ResupplyTask: ${this.destination?.id} ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }
}
