import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskPrerequisite } from "../TaskPrerequisite";

/**
 * Checks if minion has a path to a given position
 * If not, fails
 * @param pos Get reference when prerequisite is checked
 */
export class MustHavePath extends TaskPrerequisite {
    pos: RoomPosition
    constructor(
        pos: RoomPosition
    ) {
        super();
        this.pos = pos;
    }

    met(minion: SpeculativeMinion) {
        return true;// !PathFinder.search(minion.pos, this.pos).incomplete
    }
    toMeet() {
        return null;
    }
}
