import { WorldConstructionSites } from "./branches/WorldConstructionSites";
import { WorldControllers } from "./branches/WorldControllers";
import { WorldCreeps } from "./branches/WorldCreeps";
import { WorldData } from "./WorldData";
import { WorldRooms } from "./branches/WorldRooms";
import { WorldSpawns } from "./branches/WorldSpawns";
import { WorldStructures } from "./branches/WorldStructures";

export class WorldState {
    private static instance = new WorldState();
    constructor() {
        if (WorldState.instance) return WorldState.instance;
        WorldState.instance = this;
    }
    run() {
        for (let prop in this) {
            let property = this[prop];
            if (property instanceof WorldData) {
                property.run();
            }
        }
    }

    public structures = new WorldStructures();
    public constructionSites = new WorldConstructionSites();
    public controllers = new WorldControllers();
    public mySpawns = new WorldSpawns();
    public creeps = new WorldCreeps();
    public rooms = new WorldRooms();
}
