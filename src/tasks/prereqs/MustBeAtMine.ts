import { TaskPrerequisite } from "tasks/Task";
import { TravelTask } from "tasks/types/TravelTask";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export const MustBeAtMine = (getSource: () => Source|undefined) => new TaskPrerequisite(
    minion => {
        let source = getSource()
        return !!source && minion.pos.inRangeTo(source.pos, 1)
    },
    minion => {
        let source = getSource()
        if (!source) return null;
        let spaces = global.analysts.source
            .getAuxiliaryMiningLocationsForSource(minion.creep.room, source)
            .map(pos => new TravelTask(minion.creep, pos))
        if (spaces.length === 0) return null; // No adjacent mining spaces
        return spaces;
    }
)
