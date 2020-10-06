import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskPrerequisite } from "TaskRequests/TaskPrerequisite";

/**
 * Checks if minion has capacity to carry resources
 * If not, fails
 * @param quantity Get reference when prerequisite is checked
 */
export class MustHaveNoWorkParts extends TaskPrerequisite {
    met(minion: SpeculativeMinion) {
        return minion.creep.getActiveBodyparts(WORK) === 0;
    }
    toMeet() {
        return null;
    }
}
