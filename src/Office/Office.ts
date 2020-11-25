import { Bar, Meters } from "Visualizations/Meters";
import { CachedRoom, RoomData } from "WorldState/Rooms";

import { Boardroom } from "Boardroom/Boardroom";
import { BuildStrategist } from "./OfficeManagers/Strategists/BuildStrategist";
import { Controllers } from "WorldState/Controllers";
import { DefenseStrategist } from "Office/OfficeManagers/Strategists/DefenseStrategist";
import { FacilitiesManager } from "Office/OfficeManagers/FacilitiesManager";
import { HRManager } from "Office/OfficeManagers/HRManager";
import { LegalManager } from "Office/OfficeManagers/LegalManager";
import { LegalStrategist } from "Office/OfficeManagers/Strategists/LegalStrategist";
import { LinkManager } from "./OfficeManagers/LinkManager";
import { LogisticsManager } from "Office/OfficeManagers/LogisticsManager";
import { Minimap } from "Visualizations/Territory";
import { OfficeManager } from "./OfficeManager";
import { RepairStrategist } from "Office/OfficeManagers/Strategists/RepairStrategist";
import { SalesManager } from "Office/OfficeManagers/SalesManager";
import { SalesStrategist } from "Office/OfficeManagers/Strategists/SalesStrategist";
import { SecurityManager } from "Office/OfficeManagers/SecurityManager";
import { SpawnStrategist } from "Office/OfficeManagers/Strategists/SpawnStrategist";
import { StorageStrategist } from "./OfficeManagers/Strategists/StorageStrategist";
import { SurveyStrategist } from "./OfficeManagers/Strategists/SurveyStrategist";
import profiler from "screeps-profiler";

export class Office {
    name: string;
    center: CachedRoom;
    managers: Map<string, OfficeManager> = new Map();

    public get controller() {
        let controller = Controllers.byRoom(this.center.name);
        if (!controller || !(controller instanceof StructureController)) throw new Error(`Could not find controller for office ${this.center.name}`);
        return controller
    }

    constructor(public boardroom: Boardroom, roomName: string) {
        this.name = roomName;
        let room = RoomData.byRoom(roomName);
        if (!room) throw new Error(`Could not find central room for office ${roomName}`);
        this.center = room;


        // Name the office, if needed
        this.center.city ??= Memory.cities.shift();

        // Create Managers
        new HRManager(this);
        new LogisticsManager(this);

        new FacilitiesManager(this);
        new LegalManager(this);
        new SalesManager(this);
        new SecurityManager(this);
        new LinkManager(this);

        // Create Strategists
        new LegalStrategist(this);
        new SalesStrategist(this);
        new DefenseStrategist(this);
        new BuildStrategist(this);
        new RepairStrategist(this);
        new StorageStrategist(this);
        new SurveyStrategist(this);
        new SpawnStrategist(this);

    }

    register(manager: OfficeManager) {
        this.managers.set(manager.constructor.name, manager);
    }

    /**
     * Set Office priorities
     * Execute plan phase for all OfficeManagers
     */
    plan() {
        // resetDebugCPU();
        this.managers.forEach(m => {
            m.plan()
            // debugCPU(m.constructor.name);
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
        Game.map.visual.text(this.center.city ?? '', new RoomPosition(25,42,this.name), {color: '#FFFFFF', fontFamily: 'Courier New', fontSize: 7});

        this.managers.forEach(m => {
            m.cleanup()
        });
    }

    report() {
        (new RoomVisual(this.name)).text(`[greycompany ~/${this.center.city}]$`, 3, 3, {font: '2.5 Courier New', align: 'left', opacity: 0.5})
        Minimap(new RoomPosition(18, 18, this.center.name), this);
        (this.managers.get('HRManager') as HRManager)?.miniReport(new RoomPosition(2, 40, this.center.name));
        (this.managers.get('LogisticsManager') as LogisticsManager)?.miniReport(new RoomPosition(3, 5, this.center.name));
        let chart = new Meters([
            new Bar(`GCL ${Game.gcl.level}`, {fill: 'green', stroke: 'green'}, Game.gcl.progress, Game.gcl.progressTotal),
            new Bar(`RCL ${this.controller.level ?? '-'}`, {fill: 'yellow', stroke: 'yellow'}, this.controller.progress ?? 0, this.controller.progressTotal ?? 0),
            new Bar('Bucket', {fill: 'blue', stroke: 'blue'}, Game.cpu.bucket, 10000),
        ])

        chart.render(new RoomPosition(3, 18, this.center.name));
    }
}

profiler.registerClass(Office, 'Office');
