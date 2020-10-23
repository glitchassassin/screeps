import { Boardroom } from "Boardroom/Boardroom";
import { WorldState } from "WorldState/WorldState";

export class Analyst {
    public worldState = new WorldState();
    constructor(
        public boardroom: Boardroom
    ) {
        this.init();
    }
    load = () => {}
    init = () => {}
    run = () => {}
    cleanup = () => {}
}
