import { ControllerArchitect } from "Office/OfficeManagers/ControllerArchitect";
import { RoadArchitect } from "Office/OfficeManagers/RoadArchitect";
import { SourceArchitect } from "Office/OfficeManagers/SourceArchitect";
import { MinionRequest } from "MinionRequests/MinionRequest";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { OfficeManager, OfficeManagerStatus } from "./OfficeManager";
import { FacilitiesManager } from "./OfficeManagers/FacilitiesManager";
import { HRManager } from "./OfficeManagers/HRManager";
import { LegalManager } from "./OfficeManagers/LegalManager";
import { LogisticsManager } from "./OfficeManagers/LogisticsManager";
import { SalesManager } from "./OfficeManagers/SalesManager";
import { SecurityManager } from "./OfficeManagers/SecurityManager";
import { TaskManager } from "./OfficeManagers/TaskManager";
import { RoomIntelligence } from "./RoomIntelligence";

export class Office {
    name: string;
    center: RoomIntelligence;
    territories: RoomIntelligence[] = [];
    private employeeIds: Set<Id<Creep>> = new Set();
    managers: Map<string, OfficeManager> = new Map();

    constructor(roomName: string) {
        this.name = roomName;
        this.center = new RoomIntelligence(roomName);
        this.territories = Object.values(Game.map.describeExits(roomName))
                                 .filter(room => room)
                                 .map(room => new RoomIntelligence(room as string))

        // Create Architects
        new ControllerArchitect(this);
        new RoadArchitect(this);
        new SourceArchitect(this);

        // Create Managers
        new FacilitiesManager(this);
        new HRManager(this);
        new LegalManager(this);
        new LogisticsManager(this);
        new SalesManager(this);
        new SecurityManager(this);
        new TaskManager(this);

    }

    public get employees() : Creep[] {
        let employees: Creep[] = [];
        this.employeeIds.forEach(id => {
            let e = Game.getObjectById(id);
            if (!e) {
                this.employeeIds.delete(id);
            } else {
                employees.push(e);
            }
        })
        return employees;
    }

    enrollEmployee(creep: Creep) {
        this.employeeIds.add(creep.id);
    }

    register(manager: OfficeManager) {
        this.managers.set(manager.constructor.name, manager);
    }

    /**
     * Submit MinionRequests and TaskRequests to respective managers
     */
    submit(request: MinionRequest|TaskRequest) {
        if (request instanceof MinionRequest) {
            let hr = this.managers.get('HRManager') as HRManager|undefined;
            hr?.submit(request);
        }
        if (request instanceof TaskRequest) {
            let minions = this.managers.get('TaskManager') as TaskManager|undefined;
            minions?.submit(request)
        }
    }

    /**
     * Set Office priorities
     * Execute plan phase for all OfficeManagers
     */
    plan() {
        let sales = this.managers.get('SalesManager');
        let legal = this.managers.get('LegalManager');
        let facilities = this.managers.get('FacilitiesManager');
        if (this.center.room.controller?.level === 1) {
            // If RCL 1, focus on sources and controllers
            facilities?.setStatus(OfficeManagerStatus.OFFLINE);
            sales?.setStatus(OfficeManagerStatus.MINIMAL);
            legal?.setStatus(OfficeManagerStatus.NORMAL);
        } else if (
            this.center.room.controller?.level === 2 &&
            global.analysts.facilities.needsStructures(this)
        ) {
            // If RCL2 and infrastructure is incomplete, focus on construction
            facilities?.setStatus(OfficeManagerStatus.NORMAL);
            sales?.setStatus(OfficeManagerStatus.MINIMAL);
            legal?.setStatus(OfficeManagerStatus.MINIMAL);
        } else if (
            this.center.room.controller?.level === 2
        ) {
            // If RCL 2 and infrastructure is complete, focus on controller
            facilities?.setStatus(OfficeManagerStatus.MINIMAL);
            sales?.setStatus(OfficeManagerStatus.NORMAL);
            legal?.setStatus(OfficeManagerStatus.NORMAL);
        }

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
