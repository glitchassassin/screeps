import { BoardroomManager } from "./BoardroomManager";
import { Controllers } from "WorldState/Controllers";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { Office } from "Office/Office";
import { RoomAnalyst } from "./BoardroomManagers/RoomAnalyst";
import { RoomArchitect } from "./BoardroomManagers/Architects/RoomArchitect";
import { RoomData } from "WorldState/Rooms";
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
        StatisticsAnalyst.register(this);
        RoomAnalyst.register(this);

        // Create Architect
        RoomArchitect.register(this);

        // Initialize BoardroomManagers
        this.managers.forEach(m => m.init());

        // initialize new Offices, if needed
        for (let r of RoomData.all()) {
            if (Controllers.byRoom(r.name)?.my && !this.offices.has(r.name)) {
                this.offices.set(r.name,
                    new Office(this, r.name)
                );
            } else if (!Controllers.byRoom(r.name)?.my && this.offices.has(r.name)) {
                this.offices.delete(r.name);
            }
        }
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
        let closest: Office|undefined = undefined;
        let distance: number;
        this.offices.forEach(office => {
            let center = new RoomPosition(25, 25, office.name);
            let range = MapAnalyst.getRangeTo(pos, center);
            if (!distance || range < distance) {
                distance = range;
                closest = office;
            }
        })
        return closest;
    }
}

// profiler.registerClass(Boardroom, 'Boardroom');
