import { Exclude, Transform, TransformationType } from "class-transformer";
import { SpeculativeMinion } from "tasks/SpeculativeMinion";
import { Task } from "tasks/Task";
import { TaskPrerequisite } from "tasks/TaskPrerequisite";
import { TravelTask } from "tasks/types/TravelTask";
import { transformGameObject } from "utils/transformGameObject";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export class MustBeAtMine extends TaskPrerequisite {
    met(minion: SpeculativeMinion) {
        return global.analysts.source
            .getUntappedSources(minion.creep.room)
            .some(source => minion.pos.inRangeTo(source.pos, 1))
    }
    toMeet(minion: SpeculativeMinion) {
        let spaces = global.analysts.source
            .getUntappedSources(minion.creep.room)
            .map(source => new TravelTask(source.pos, 1))
        return spaces;
    }
}
