import { Boardroom } from "Boardroom/Boardroom";

export class Analyst {
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
