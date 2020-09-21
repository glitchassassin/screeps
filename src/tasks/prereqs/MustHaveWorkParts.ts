import { Exclude } from "class-transformer";
import { SpeculativeMinion } from "tasks/SpeculativeMinion";
import { TaskPrerequisite } from "tasks/TaskPrerequisite";
import { HarvestTask } from "tasks/types/HarvestTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";

/**
 * Checks if minion has capacity to carry resources
 * If not, fails
 * @param quantity Get reference when prerequisite is checked
 */
export class MustHaveWorkParts extends TaskPrerequisite {
    met(minion: SpeculativeMinion) {
        return minion.creep.getActiveBodyparts(WORK) > 0;
    }
    toMeet() {
        return null;
    }
}
