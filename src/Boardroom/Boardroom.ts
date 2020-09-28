import { Office } from "Office/Office";
import { BoardroomManager } from "./BoardroomManager";

export class Boardroom {
    offices: Office[] = [];
    managers: BoardroomManager[] = [];

    /**
     * Initialize boardroom managers and offices
     */
    constructor() {
        // Initialize Memory
        if (!Memory.flags) Memory.flags = {};
        if (!Memory.rooms) Memory.rooms = {};
        if (!Memory.creeps) Memory.creeps = {};
        if (!Memory.metrics) Memory.metrics = {};
        if (!Memory.hr) Memory.hr = {};

        // Initialize Offices
        Object.values(Game.spawns).forEach(spawn => {
            if (!this.offices.some(o => o.center.name === spawn.room.name)) {
                let office = new Office(spawn.room.name);
                this.offices.push(office);
            }
        })

        // Create BoardroomManagers
        // [none yet]

        // Initialize BoardroomManagers
        this.managers.forEach(m => m.init());
    }

    /**
     * Register a new BoardroomManager with lifecycle functions
     * This is called automatically by the BoardroomManager's constructor
     * @param manager
     */
    register(manager: BoardroomManager) {
        this.managers.push(manager);
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
