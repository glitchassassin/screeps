import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { Exclude } from "class-transformer";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { Task } from "TaskRequests/Task";
import { TaskPrerequisite } from "TaskRequests/TaskPrerequisite";
import { HarvestTask } from "TaskRequests/types/HarvestTask";
import { WithdrawTask } from "TaskRequests/types/WithdrawTask";
import { getCreepHomeOffice } from "utils/gameObjectSelectors";

/**
 * Checks if minion is full or has enough energy to meet quantity
 * If not, creates tasks to harvest or withdraw energy
 * @param quantity Get reference when prerequisite is checked
 */
export class MustHaveEnergy extends TaskPrerequisite {
    constructor(
        public quantity: number
    ) { super(); }

    met(minion: SpeculativeMinion) {
        if (this.quantity <= 0) return false;
               // Minion can carry energy, and
        return minion.capacity > 0 &&
               // Minion has a full tank or enough to meet `quantity`
               minion.capacityUsed >= Math.min(this.quantity, minion.capacity)
    };
    toMeet(minion: SpeculativeMinion) {
        if (minion.capacity === 0) return null; // Cannot carry energy
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;

        // TODO: Check if source/container has enough energy to fill minion
        // Can get energy from harvesting
        let office = getCreepHomeOffice(minion.creep);
        if (!office) return [];

        // Can get energy from withdrawing
        let containers = logisticsAnalyst.getUnallocatedSources(office)
                                                  .map(source => new WithdrawTask(source));
        return containers;
    }
}
