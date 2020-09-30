import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { Exclude } from "class-transformer";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { Task } from "TaskRequests/Task";
import { TaskPrerequisite } from "TaskRequests/TaskPrerequisite";
import { HarvestTask } from "TaskRequests/types/HarvestTask";
import { WithdrawTask } from "TaskRequests/types/WithdrawTask";
import { getCreepHomeOffice } from "utils/gameObjectSelectors";
import { MustHaveEnergy } from "./MustHaveEnergy";

/**
 * Checks if minion is full or has enough energy to meet quantity
 * If not, creates tasks to harvest or withdraw energy
 * @param quantity Get reference when prerequisite is checked
 */
export class MustHaveEnergyFromSource extends MustHaveEnergy {
    toMeet(minion: SpeculativeMinion) {
        if (minion.capacity === 0) return null; // Cannot carry energy
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;

        let office = getCreepHomeOffice(minion.creep);
        if (!office) return [];

        let sources = salesAnalyst.getUntappedSources(office)
                                            .map(franchise => new HarvestTask(franchise));

        let sourceContainers = logisticsAnalyst.getAllSources(office)
            .filter(source => !(source instanceof StructureSpawn))

        return [...sources, ...sourceContainers.map(source => new WithdrawTask(source))];
    }
}
