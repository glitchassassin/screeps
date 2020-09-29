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
import { RoomIntelligence, TerritoryIntelligence } from "./RoomIntelligence";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { table } from "table";

export class Office {
    name: string;
    center: RoomIntelligence;
    territories: TerritoryIntelligence[] = [];
    franchiseLocations: {[sourceId: string]: RoomPosition} = {};
    private employeeIds: Set<Id<Creep>> = new Set();
    managers: Map<string, OfficeManager> = new Map();

    constructor(roomName: string) {
        this.name = roomName;
        this.center = new RoomIntelligence(roomName);
        this.territories = Object.values(Game.map.describeExits(roomName))
                                 .filter(room => room)
                                 .map(room => new RoomIntelligence(room as string))

        // Initialize Memory
        if (!Memory.offices[roomName]) {
            Memory.offices[roomName] = {
                franchiseLocations: {}
            }
        }

        // Load saved franchise locations
        this.franchiseLocations = Object.entries(Memory.offices[roomName].franchiseLocations).reduce((obj, [sourceId, pos]) => {
            obj[sourceId] = new RoomPosition(pos.x, pos.y, pos.roomName);
            return obj;
        }, {} as {[sourceId: string]: RoomPosition});

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
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst

        let sales = this.managers.get('SalesManager');
        let legal = this.managers.get('LegalManager');
        let facilities = this.managers.get('FacilitiesManager');
        let logistics = this.managers.get('LogisticsManager');
        let security = this.managers.get('SecurityManager');

        // Review territories
        this.center.scan();
        this.territories.forEach(t => t.scan());

        if (this.center.room.controller?.level === 1) {
            // If RCL 1, focus on sources and controllers
            sales?.setStatus(OfficeManagerStatus.MINIMAL);
            logistics?.setStatus(OfficeManagerStatus.OFFLINE);
            legal?.setStatus(OfficeManagerStatus.MINIMAL);
            facilities?.setStatus(OfficeManagerStatus.OFFLINE);
            security?.setStatus(OfficeManagerStatus.OFFLINE);
        } else if (
            this.center.room.controller?.level === 2 &&
            facilitiesAnalyst.needsStructures(this)
        ) {
            // If RCL2 and infrastructure is incomplete, focus on construction
            sales?.setStatus(OfficeManagerStatus.MINIMAL);
            logistics?.setStatus(OfficeManagerStatus.OFFLINE);
            legal?.setStatus(OfficeManagerStatus.MINIMAL);
            facilities?.setStatus(OfficeManagerStatus.MINIMAL);
            security?.setStatus(OfficeManagerStatus.OFFLINE);
        } else if (
            this.center.room.controller?.level === 2
        ) {
            // If RCL 2 and infrastructure is complete, focus on controller
            sales?.setStatus(OfficeManagerStatus.NORMAL);
            logistics?.setStatus(OfficeManagerStatus.NORMAL);
            legal?.setStatus(OfficeManagerStatus.NORMAL);
            facilities?.setStatus(OfficeManagerStatus.OFFLINE);
            security?.setStatus(OfficeManagerStatus.OFFLINE);
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
        Memory.offices[this.name].franchiseLocations = this.franchiseLocations;
        this.managers.forEach(m => m.cleanup());
    }

    report() {
        const statusTable = [
            ['Manager', 'Status']
        ];
        this.managers.forEach(manager => {
            statusTable.push([manager.constructor.name, manager.status]);
        })
        const statusTableRendered = table(statusTable, {
            singleLine: true
        });

        const territoryTable = [
            ['Territory', 'Status']
        ];
        this.territories.forEach(territory => {
            territoryTable.push([territory.name, territory.scanned ? 'SCANNED' : 'UNKNOWN']);
        })
        const territoryTableRendered = table(territoryTable, {
            singleLine: true
        });

        console.log(`[Office ${this.name}] Status Report:
    <strong>Managers</strong>
${statusTableRendered}
    <strong>Managers</strong>
${territoryTableRendered}`
        )
    }
}

global.officeReport = () => {
    global.boardroom.offices.forEach(office => office.report())
}
