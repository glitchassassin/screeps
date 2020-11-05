import { WorldConstructionSites } from "./branches/WorldConstructionSites";
import { WorldControllers } from "./branches/WorldControllers";
import { WorldData } from "./WorldData";
import { WorldHostileCreeps } from "./branches/WorldHostileCreeps";
import { WorldMinerals } from "./branches/WorldMinerals";
import { WorldMyCreeps } from "./branches/WorldMyCreeps";
import { WorldResources } from "./branches/WorldResources";
import { WorldRooms } from "./branches/WorldRooms";
import { WorldSources } from "./branches/WorldSources";
import { WorldSpawns } from "./branches/WorldSpawns";
import { WorldStructures } from "./branches/WorldStructures";
import { WorldTombstones } from "./branches/WorldTombstones";

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
    public myCreeps = new WorldMyCreeps();
    public hostileCreeps = new WorldHostileCreeps();
    public rooms = new WorldRooms();
    public tombstones = new WorldTombstones();
    public resources = new WorldResources();
    public sources = new WorldSources();
    public minerals = new WorldMinerals();
}
