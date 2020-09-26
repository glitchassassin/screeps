class Office {
    center: RoomIntelligence;
    territories: RoomIntelligence[] = [];
    employees: Id<Creep>[] = [];
    managers: OfficeManager[] = [];

    constructor(roomName: string) {
        this.center = new RoomIntelligence(roomName);
    }

    register(manager: OfficeManager) {
        this.managers.push(manager);
    }

    /**
     * Initialize all OfficeManagers
     */
    init() {
        this.managers.forEach(m => m.init());
    }

    /**
     * Execute plan phase for all OfficeManagers
     */
    plan() {
        this.managers.forEach(m => m.plan());
    }

    /**
     * Execute run phase for all OfficeManagers
     */
    run() {
        this.managers.forEach(m => m.run());
    }

    /**
     * Execute run phase for all OfficeManagers
     */
    cleanup() {
        this.managers.forEach(m => m.cleanup());
    }
}
