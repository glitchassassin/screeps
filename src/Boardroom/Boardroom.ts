import { Office } from "Office/Office";
import { BoardroomManager } from "./BoardroomManager";
import { ControllerAnalyst } from "./BoardroomManagers/ControllerAnalyst";
import { DefenseAnalyst } from "./BoardroomManagers/DefenseAnalyst";
import { FacilitiesAnalyst } from "./BoardroomManagers/FacilitiesAnalyst";
import { GrafanaAnalyst } from "./BoardroomManagers/GrafanaAnalyst";
import { HRAnalyst } from "./BoardroomManagers/HRAnalyst";
import { LogisticsAnalyst } from "./BoardroomManagers/LogisticsAnalyst";
import { MapAnalyst } from "./BoardroomManagers/MapAnalyst";
import { SalesAnalyst } from "./BoardroomManagers/SalesAnalyst";
import { StatisticsAnalyst } from "./BoardroomManagers/StatisticsAnalyst";

export class Boardroom {
    offices: Map<string, Office> = new Map();
    managers: Map<string, BoardroomManager> = new Map();

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
        if (!Memory.tasks) Memory.tasks = {};

        // Initialize Offices
        Object.values(Game.spawns).forEach(spawn => {
            if (!this.offices.get(spawn.room.name)) {
                this.offices.set(spawn.room.name, new Office(spawn.room.name));
            }
        })

        // Create BoardroomManagers
        new MapAnalyst(this);
        new ControllerAnalyst(this);
        new DefenseAnalyst(this);
        new FacilitiesAnalyst(this);
        new GrafanaAnalyst(this);
        new HRAnalyst(this);
        new LogisticsAnalyst(this);
        new SalesAnalyst(this);
        new StatisticsAnalyst(this);

        // Initialize BoardroomManagers
        this.managers.forEach(m => m.init());
    }

    /**
     * Register a new BoardroomManager with lifecycle functions
     * This is called automatically by the BoardroomManager's constructor
     * @param manager
     */
    register(manager: BoardroomManager) {
        this.managers.set(manager.constructor.name, manager);
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
