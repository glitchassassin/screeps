import { Boardroom } from "./Boardroom";

export class BoardroomManager {
    constructor(
        public boardroom: Boardroom
    ) {
        boardroom.register(this);
        this.init();
    }

    static register(boardroom: Boardroom) {
        return new this(boardroom);
    }

    /**
     * Load any persistent data from Memory
     *
     * Invoked by constructor after every global reset
     */
    init() { }

    /**
     * Create requests (but don't commit any game changes)
     *
     * Invoked every tick
     */
    plan() { }

    /**
     * Commit persistent data to Memory
     *
     * Invoked every tick
     */
    cleanup() { }
}
