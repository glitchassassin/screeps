import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "tasks/prereqs/MustHaveEnergy";
import { MustHaveEnergyFromSource } from "tasks/prereqs/MustHaveEnergyFromSource";
import { SpeculativeMinion } from "tasks/SpeculativeMinion";
import { TaskAction } from "tasks/TaskAction";
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
            new MustBeAdjacent(this.destination.pos),
            new MustHaveEnergyFromSource((this.destination as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY))
        ]
    }
}
