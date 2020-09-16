import { TaskPrerequisite } from "tasks/Task";
import { TravelTask } from "tasks/types/TravelTask";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export const MustBeAdjacent = (pos: () => RoomPosition|undefined) => new TaskPrerequisite(
    minion => {
        let p = pos();
        return !!p && minion.pos.inRangeTo(p, 1)
    },
    minion => {
        let p = pos();
        if (!p) return null;
        let spaces = global.analysts.map.calculateAdjacentPositions(p)
            .filter(global.analysts.map.isPositionWalkable)
        if (spaces.length === 0) return null; // No adjacent spaces
        return spaces.map(space => new TravelTask(minion.creep, space));
    }
)
