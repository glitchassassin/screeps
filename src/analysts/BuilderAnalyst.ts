import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export class BuilderAnalyst extends Analyst {
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getConstructionSites(room: Room) {
        return room.find(FIND_MY_CONSTRUCTION_SITES)
    }
}
