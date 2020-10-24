import { WorldConstructionSites } from "./branches/WorldConstructionSites";
import { WorldControllers } from "./branches/WorldControllers";
import { WorldData } from "./WorldData";
import { WorldStructures } from "./branches/WorldStructures";

export class WorldState {
    private static instance = new WorldState();
    constructor() {
        if (WorldState.instance) return WorldState.instance;
        WorldState.instance = this;
    }
    run() {
        console.log('WorldState')
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
}
