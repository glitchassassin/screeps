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
    @Transform(transformGameObject(Source))
    source: Source
    constructor(
        source: Source
    ) {
        super();
        this.source = source;
    }

    met(minion: SpeculativeMinion) {
        return minion.pos.inRangeTo(this.source.pos, 1)
    }
    toMeet(minion: SpeculativeMinion) {
        let spaces = global.analysts.source
            .getAuxiliaryMiningLocationsForSource(minion.creep.room, this.source)
            .map(pos => new TravelTask(pos))
        if (spaces.length === 0) return null; // No adjacent mining spaces
        return spaces;
    }
}
