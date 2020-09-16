import { TaskPrerequisite } from "tasks/Task";
import { TravelTask } from "tasks/types/TravelTask";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export const MustHavePath = (pos: () => RoomPosition|undefined) => new TaskPrerequisite(
    minion => {
        let p = pos();
        return !!p && !PathFinder.search(minion.pos, p).incomplete
    },
    minion => null
)
