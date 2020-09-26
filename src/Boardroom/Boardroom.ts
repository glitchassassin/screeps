class Boardroom {
    offices: Office[] = [];
    managers: BoardroomManager[] = [];

    register(manager: BoardroomManager) {
        this.managers.push(manager);
    }

    /**
     * Initialize boardroom managers and offices
     */
    init() {
        this.managers.forEach(m => m.init());
        this.offices.forEach(o => o.init());
    }

    /**
     * Run plan phase for boardroom managers
     */
    plan() {
        this.managers.forEach(m => m.plan());
    }

    /**
     * Run cleanup phase for boardroom managers
     */
    cleanup() {
        this.managers.forEach(m => m.cleanup());
    }
}
