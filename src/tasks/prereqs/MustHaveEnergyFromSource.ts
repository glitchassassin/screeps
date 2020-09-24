import { Exclude } from "class-transformer";
import { SpeculativeMinion } from "tasks/SpeculativeMinion";
import { Task } from "tasks/Task";
import { TaskPrerequisite } from "tasks/TaskPrerequisite";
import { HarvestTask } from "tasks/types/HarvestTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { MustHaveEnergy } from "./MustHaveEnergy";

/**
 * Checks if minion is full or has enough energy to meet quantity
 * If not, creates tasks to harvest or withdraw energy
 * @param quantity Get reference when prerequisite is checked
 */
export class MustHaveEnergyFromSource extends MustHaveEnergy {
    toMeet(minion: SpeculativeMinion) {
        if (minion.capacity === 0) return null; // Cannot carry energy

        // // Get mine containers only
        // let sources = global.analysts.source.getDesignatedMiningLocations(minion.creep.room)
        //     .map(mine => mine.container)
        //     .filter(c => c) as StructureContainer[]

        // Get most full mine container only
        let sourceContainers = (global.analysts.source.getDesignatedMiningLocations(minion.creep.room)
            .map(mine => mine.container)
            .filter(c => c) as StructureContainer[])

        if (sourceContainers.length === 0) return [];

        let source = sourceContainers.reduce((a, b) => (a && a.store.getUsedCapacity(RESOURCE_ENERGY) > b.store.getUsedCapacity(RESOURCE_ENERGY) ? a : b))

        return [new WithdrawTask(source)];
    }
}
