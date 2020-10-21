import { WorldData } from "./WorldData";
import { WorldStructures } from "./WorldStructures";

export class WorldState {
    private static instance = new WorldState();
    constructor() {
        if (WorldState.instance) return WorldState.instance;
        WorldState.instance = this;
    }
    run() {
        for (let prop of Object.values(this)) {
            if (prop instanceof WorldData) {
                prop.run();
            }
        }
    }

    structures = new WorldStructures();
}
