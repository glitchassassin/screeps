import { BoardroomManager } from "./BoardroomManager";
import { ControllerAnalyst } from "./BoardroomManagers/ControllerAnalyst";
import { DefenseAnalyst } from "./BoardroomManagers/DefenseAnalyst";
import { FacilitiesAnalyst } from "./BoardroomManagers/FacilitiesAnalyst";
import { GrafanaAnalyst } from "./BoardroomManagers/GrafanaAnalyst";
import { HRAnalyst } from "./BoardroomManagers/HRAnalyst";
import { LogisticsAnalyst } from "./BoardroomManagers/LogisticsAnalyst";
import { MapAnalyst } from "./BoardroomManagers/MapAnalyst";
import { Office } from "Office/Office";
import { RoomAnalyst } from "./BoardroomManagers/RoomAnalyst";
import { RoomArchitect } from "./BoardroomManagers/Architects/RoomArchitect";
import { SalesAnalyst } from "./BoardroomManagers/SalesAnalyst";
import { StatisticsAnalyst } from "./BoardroomManagers/StatisticsAnalyst";
import { cityNames } from "./CityNames";

export class Boardroom {
    offices: Map<string, Office> = new Map();
    managers: Map<string, BoardroomManager> = new Map();

    /**
     * Initialize boardroom managers and offices
     */
    constructor() {
        // Initialize Memory
        Memory.flags ??= {};
        Memory.rooms ??= {};
        Memory.creeps ??= {};
        Memory.metrics ??= {};
        Memory.offices ??= {};
        Memory.hr ??= {};
        Memory.tasks ??= {};
        Memory.boardroom ??= {};
        Memory.cities ??= cityNames;

        // Create BoardroomManagers
        MapAnalyst.register(this);
        ControllerAnalyst.register(this);
        DefenseAnalyst.register(this);
        FacilitiesAnalyst.register(this);
        GrafanaAnalyst.register(this);
        HRAnalyst.register(this);
        LogisticsAnalyst.register(this);
        SalesAnalyst.register(this);
        StatisticsAnalyst.register(this);
        RoomAnalyst.register(this);

        // Create Architects
        RoomArchitect.register(this);

        // Initialize BoardroomManagers
        this.managers.forEach(m => m.init());

        // Initialize Offices
        Object.values(Game.spawns).forEach(spawn => {
            if (!this.offices.get(spawn.room.name)) {
                this.offices.set(spawn.room.name, new Office(this, spawn.room.name));
            }
        })
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
        this.managers.forEach(m => {
            m.plan()
        });
    }

    /**
     * Run cleanup phase for boardroom managers
     */
    cleanup() {
        this.managers.forEach(m => {
            m.cleanup()
        });
    }

    getClosestOffice(pos: RoomPosition): Office|undefined {
        let mapAnalyst = this.managers.get('MapAnalyst') as MapAnalyst;
        let closest: Office|undefined = undefined;
        let distance: number;
        this.offices.forEach(office => {
            let center = new RoomPosition(25, 25, office.name);
            let range = mapAnalyst.getRangeTo(pos, center);
            if (!distance || range < distance) {
                distance = range;
                closest = office;
            }
        })
        return closest;
    }
}

// profiler.registerClass(Boardroom, 'Boardroom');
