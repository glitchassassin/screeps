import { Transform } from "class-transformer";
import { TransformationType } from "class-transformer/enums";
import { SpeculativeMinion, TaskPrerequisite } from "tasks/Task";
import { TravelTask } from "tasks/types/TravelTask";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export class MustBeAdjacent extends TaskPrerequisite {
    @Transform((value, obj, type) => {
        if (type === TransformationType.PLAIN_TO_CLASS) {
            return Game.rooms[value.roomName].getPositionAt(value.x, value.y);
        }
        return obj;
    })
    pos: RoomPosition
    constructor(
        pos: RoomPosition
    ) {
        super();
        this.pos = pos;
    }

    met = (minion: SpeculativeMinion) => {
        let p = this.pos;
        return !!p && minion.pos.inRangeTo(p, 1)
    };
    toMeet = (minion: SpeculativeMinion) => {
        let p = this.pos;
        if (!p) return null;
        let spaces = global.analysts.map.calculateAdjacentPositions(p)
            .filter(global.analysts.map.isPositionWalkable)
        if (spaces.length === 0) return null; // No adjacent spaces
        return spaces.map(space => new TravelTask(minion.creep, space));
    }
}
