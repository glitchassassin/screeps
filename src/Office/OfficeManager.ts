abstract class OfficeManager {
    constructor(
        public office: Office
    ) {
        office.register(this);
    }

    /**
     * Load any persistent data from Memory
     *
     * Invoked after every global reset
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
