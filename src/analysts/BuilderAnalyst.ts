import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export class BuilderAnalyst extends Analyst {
    getConstructionSites = (room: Room) => {
        return room.find(FIND_MY_CONSTRUCTION_SITES)
    }
}
