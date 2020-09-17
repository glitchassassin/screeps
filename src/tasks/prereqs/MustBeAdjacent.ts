import { Exclude, Transform, TransformationType } from "class-transformer";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskPrerequisite } from "../TaskPrerequisite";
import { TravelTask } from "tasks/types/TravelTask";
import { Task } from "tasks/Task";

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

    met(minion: SpeculativeMinion) {
        return minion.pos.inRangeTo(this.pos, 1)
    };
    toMeet(minion: SpeculativeMinion) {
        let spaces = global.analysts.map.calculateAdjacentPositions(this.pos)
            .filter(global.analysts.map.isPositionWalkable)
        if (spaces.length === 0) return null; // No adjacent spaces
        return spaces.map(space => new TravelTask(space));
    }
}
