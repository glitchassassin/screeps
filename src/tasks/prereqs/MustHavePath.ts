import { Transform, TransformationType } from "class-transformer";
import { SpeculativeMinion, TaskPrerequisite } from "../Task";

/**
 * Checks if minion is adjacent to a given position
 * If not, creates TravelTask(s) to each possible adjacent position
 * @param pos Get reference when prerequisite is checked
 */
export class MustHavePath extends TaskPrerequisite {
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
        return !PathFinder.search(minion.pos, this.pos).incomplete
    }
    toMeet = () => null;
}
