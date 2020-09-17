import { Exclude, Transform, TransformationType } from "class-transformer";
import { SpeculativeMinion } from "tasks/SpeculativeMinion";
import { Task } from "tasks/Task";
import { TaskPrerequisite } from "tasks/TaskPrerequisite";
import { TravelTask } from "tasks/types/TravelTask";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export class MustBeAtMine extends TaskPrerequisite {
    @Transform((value, obj, type) => {
        switch(type) {
            case TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<Source>)
            case TransformationType.CLASS_TO_PLAIN:
                return obj.id
            case TransformationType.CLASS_TO_CLASS:
                return obj
        }
    })
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
