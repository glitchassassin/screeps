import { TaskPrerequisite } from "tasks/Task";
import { HarvestTask } from "tasks/types/HarvestTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";

/**
 * Checks if minion has capacity to carry resources
 * If not, fails
 * @param quantity Get reference when prerequisite is checked
 */
export const MustHaveCarryCapacity = () => new TaskPrerequisite(
    minion => minion.capacity - minion.capacityUsed > 0,
    minion => (null)
)
