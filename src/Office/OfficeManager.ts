import { Office } from "./Office";
import { WorldState } from "WorldState/WorldState";

export enum OfficeManagerStatus {
    OFFLINE = 'OFFLINE',
    MINIMAL = 'MINIMAL',
    NORMAL = 'NORMAL',
    PRIORITY = 'PRIORITY',
}

export abstract class OfficeManager {
    status = OfficeManagerStatus.NORMAL;
    public worldState = new WorldState();

    constructor(
        public office: Office
    ) {
        office.register(this);
        this.init()
    }

    setStatus(status: OfficeManagerStatus) {
        this.status = status;
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
     * Execute (requests, tasks, other game actions)
     *
     * Invoked every tick
     */
    run() { }

    /**
     * Commit persistent data to Memory
     *
     * Invoked every tick
     */
    cleanup() { }
}
