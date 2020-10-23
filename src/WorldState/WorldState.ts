import { WorldConstructionSites } from "./WorldConstructionSites";
import { WorldData } from "./WorldData";
import { WorldStructures } from "./WorldStructures";

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
}
