import { Exclude, Transform, TransformationType } from "class-transformer";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { Task } from "TaskRequests/Task";
import { TaskPrerequisite } from "TaskRequests/TaskPrerequisite";
import { TravelTask } from "TaskRequests/types/TravelTask";
import { transformGameObject } from "utils/transformGameObject";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export class MustBeAtMine extends TaskPrerequisite {
    met(minion: SpeculativeMinion) {
        return global.analysts.sales
            .getUntappedSources(minion.creep.room)
            .some(source => minion.pos.inRangeTo(source.pos, 1))
    }
    toMeet(minion: SpeculativeMinion) {
        let spaces = global.analysts.sales
            .getUntappedSources(minion.creep.room)
            .map(source => new TravelTask(source.pos, 1))
        return spaces;
    }
}
