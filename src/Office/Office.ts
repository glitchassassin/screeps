import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { ControllerArchitect } from "Office/OfficeManagers/ControllerArchitect";
import { RoadArchitect } from "Office/OfficeManagers/RoadArchitect";
import { SourceArchitect } from "Office/OfficeManagers/SourceArchitect";
import profiler from "screeps-profiler";
import { Minimap } from "Visualizations/Territory";
import { OfficeManager, OfficeManagerStatus } from "./OfficeManager";
import { FacilitiesManager } from "./OfficeManagers/FacilitiesManager";
import { HRManager } from "./OfficeManagers/HRManager";
import { LegalManager } from "./OfficeManagers/LegalManager/LegalManager";
import { LogisticsManager } from "./OfficeManagers/LogisticsManager";
import { SalesManager } from "./OfficeManagers/SalesManager";
import { SecurityManager } from "./OfficeManagers/SecurityManager/SecurityManager";
import { RoomIntelligence, TerritoryIntelligence } from "./RoomIntelligence";

export class Office {
    name: string;
    center: RoomIntelligence;
    territories: TerritoryIntelligence[] = [];
    franchiseLocations: {[sourceId: string]: {franchise: RoomPosition, source: RoomPosition}} = {};
    private employeeNames: Set<string> = new Set();
    managers: Map<string, OfficeManager> = new Map();

    constructor(roomName: string) {
        this.name = roomName;
        this.center = new RoomIntelligence(roomName);

        // Initialize Memory
        if (!Memory.offices[roomName]) {
            Memory.offices[roomName] = {
                employees: [],
                franchiseLocations: {},
                territories: {}
            }
        }

        // Load saved employees
        this.employeeNames = new Set(Memory.offices[roomName].employees)

        // Load saved franchise locations
        this.franchiseLocations = Object.entries(Memory.offices[roomName].franchiseLocations).reduce((obj, [sourceId, pos]) => {
            if (!pos.franchise || !pos.source) return obj;
            obj[sourceId] = {
                franchise: new RoomPosition(pos.franchise.x, pos.franchise.y, pos.franchise.roomName),
                source: new RoomPosition(pos.source.x, pos.source.y, pos.source.roomName)
            }
            return obj;
        }, {} as {[sourceId: string]: {franchise: RoomPosition, source: RoomPosition}});

        // Load saved territory details
        this.territories = Object.values(Game.map.describeExits(roomName))
            .filter(room => room)
            .map(room => {
                let territory = new TerritoryIntelligence(room as string);
                if (Memory.offices[roomName].territories[room as string]) {
                    let c = Memory.offices[roomName].territories[room as string].controller
                    territory.controller = {
                        pos: c.pos && new RoomPosition(c.pos.x, c.pos.y, c.pos.roomName),
                        ...c
                    }
                    territory.scanned = Memory.offices[roomName].territories[room as string].scanned;
                    territory.lastHostileActivity = Memory.offices[roomName].territories[room as string].lastHostileActivity;
                    territory.sources = new Map(Object.entries(Memory.offices[roomName].territories[room as string].sources)
                        .map(([id, pos]) => [id as Id<Source>, new RoomPosition(pos.x, pos.y, pos.roomName)]));
                }
                return territory;
            })

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

    }

    public get employees() : Creep[] {
        let employees: Creep[] = [];
        this.employeeNames.forEach(id => {
            let e: Creep|null = Game.creeps[id]
            if (!e) {
                this.employeeNames.delete(id);
                e = Game.getObjectById(id as Id<Creep>);
                if (e) {
                    this.employeeNames.add(e.name);
                    employees.push(e);
                }
            } else {
                employees.push(e);
            }
        })
        return employees;
    }

    enrollEmployee(creep: Creep) {
        this.employeeNames.add(creep.name);
    }

    register(manager: OfficeManager) {
        this.managers.set(manager.constructor.name, manager);
    }

    /**
     * Set Office priorities
     * Execute plan phase for all OfficeManagers
     */
    plan() {
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst

        let hr = this.managers.get('HRManager');
        let sales = this.managers.get('SalesManager');
        let legal = this.managers.get('LegalManager');
        let facilities = this.managers.get('FacilitiesManager');
        let logistics = this.managers.get('LogisticsManager');
        let security = this.managers.get('SecurityManager');

        // Review territories
        this.center.scan();
        this.territories.forEach(t => t.scan());
        [this.center, ...this.territories].forEach(t =>
            t.room?.find(FIND_MY_CREEPS).filter(c => c.memory.office === this.name).forEach(c => this.enrollEmployee(c))
        );

        if (this.center.room.controller?.level === 1) {
            // If RCL 1, focus on sources and controllers
            // console.log('RCL1')
            hr?.setStatus(OfficeManagerStatus.PRIORITY);
            sales?.setStatus(OfficeManagerStatus.MINIMAL);
            logistics?.setStatus(OfficeManagerStatus.MINIMAL);
            legal?.setStatus(OfficeManagerStatus.MINIMAL);
            facilities?.setStatus(OfficeManagerStatus.OFFLINE);
            security?.setStatus(OfficeManagerStatus.OFFLINE);
        } else if (
            this.center.room.controller?.level === 2 &&
            facilitiesAnalyst.needsStructures(this)
        ) {
            // If RCL2 and infrastructure is incomplete, focus on construction
            // console.log('RCL2, building infrastructure')
            hr?.setStatus(OfficeManagerStatus.MINIMAL);
            sales?.setStatus(OfficeManagerStatus.MINIMAL);
            logistics?.setStatus(OfficeManagerStatus.NORMAL);
            legal?.setStatus(OfficeManagerStatus.MINIMAL);
            facilities?.setStatus(OfficeManagerStatus.NORMAL);
            security?.setStatus(OfficeManagerStatus.OFFLINE);
        } else if (
            this.center.room.controller?.level === 2
        ) {
            // If RCL 2 and infrastructure is complete, focus on controller
            // console.log('RCL2, infrastructure complete')
            sales?.setStatus(OfficeManagerStatus.NORMAL);
            logistics?.setStatus(OfficeManagerStatus.NORMAL);
            legal?.setStatus(OfficeManagerStatus.NORMAL);
            facilities?.setStatus(OfficeManagerStatus.OFFLINE);
            security?.setStatus(OfficeManagerStatus.OFFLINE);
        }

        this.managers.forEach(m => {
            m.plan()
        });
    }

    /**
     * Execute run phase for all OfficeManagers
     */
    run() {
        this.managers.forEach(m => {
            m.run();
        });
        if (global.v.office.state) {
            this.report();
        }
    }

    /**
     * Execute run phase for all OfficeManagers
     */
    cleanup() {
        if (!Memory.offices[this.name]) Memory.offices[this.name] = {
            employees: [],
            franchiseLocations: {},
            territories: {}
        }
        Memory.offices[this.name].employees = Array.from(this.employeeNames);
        Memory.offices[this.name].franchiseLocations = this.franchiseLocations;
        Memory.offices[this.name].territories = this.territories.reduce((obj, territory) => {
            obj[territory.name] = {
                controller: territory.controller,
                scanned: territory.scanned,
                lastHostileActivity: territory.lastHostileActivity,
                sources: Array.from(territory.sources.entries()).reduce((a, [id, pos]) => {
                    a[id as string] = pos
                    return a;
                }, {} as {[id: string]: RoomPosition})
            }
            return obj;
        }, {} as {
            [roomName: string]: {
                controller: {
                    pos?: RoomPosition,
                    my?: boolean,
                },
                sources: {[id: string]: RoomPosition},
                scanned: number,
                lastHostileActivity?: number
            }
        })
        this.managers.forEach(m => {
            m.cleanup()
        });
    }

    purge() {
        this.franchiseLocations = {};
        this.territories = [];
        Memory.offices[this.name] = {
            employees: [],
            franchiseLocations: {},
            territories: {}
        }
    }

    report() {
        Minimap(new RoomPosition(18, 18, this.center.name), this);
    }
}

profiler.registerClass(Office, 'Office');
