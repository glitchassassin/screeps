import { Bar, Dashboard, DashboardWidget, Grid, Rectangle, Table } from "screeps-viz";
import { CachedRoom, RoomData } from "WorldState/Rooms";

import { Boardroom } from "Boardroom/Boardroom";
import { BuildStrategist } from "./OfficeManagers/Strategists/BuildStrategist";
import { Controllers } from "WorldState/Controllers";
import { DefenseStrategist } from "Office/OfficeManagers/Strategists/DefenseStrategist";
import { FacilitiesManager } from "Office/OfficeManagers/FacilitiesManager";
import { HRManager } from "Office/OfficeManagers/HRManager";
import { LegalData } from "WorldState/LegalData";
import { LegalManager } from "Office/OfficeManagers/LegalManager";
import { LegalStrategist } from "Office/OfficeManagers/Strategists/LegalStrategist";
import { LinkManager } from "./OfficeManagers/LinkManager";
import { LogisticsManager } from "Office/OfficeManagers/LogisticsManager";
import { Minimap } from "Visualizations/Territory";
import { OfficeManager } from "./OfficeManager";
import { SalesManager } from "Office/OfficeManagers/SalesManager";
import { SalesStrategist } from "Office/OfficeManagers/Strategists/SalesStrategist";
import { SecurityManager } from "Office/OfficeManagers/SecurityManager";
import { SpawnStrategist } from "Office/OfficeManagers/Strategists/SpawnStrategist";
import { StorageStrategist } from "./OfficeManagers/Strategists/StorageStrategist";
import { SurveyStrategist } from "./OfficeManagers/Strategists/SurveyStrategist";

export class Office {
    name: string;
    center: CachedRoom;
    managers: Map<string, OfficeManager> = new Map();
    dashboard: DashboardWidget[] = [];

    milestones = [
        {
            pos: { x: 3, y: 18 },
            width: 5,
            height: 5,
            widget: Rectangle({
                data: Grid({
                    data: [
                        Bar(() => ({
                            data: {
                                value: Game.gcl.progress,
                                maxValue: Game.gcl.progressTotal
                            },
                            config: {
                                label: `GCL ${Game.gcl.level}`,
                                style: {fill: 'green', stroke: 'green'}
                            }
                        })),
                        Bar(() => ({
                            data: {
                                value: this.controller.progress ?? 0,
                                maxValue: this.controller.progressTotal ?? 0
                            },
                            config: {
                                label: `RCL ${this.controller.level ?? '-'}`,
                                style: {fill: 'yellow', stroke: 'yellow'}
                            }
                        })),
                    ],
                    config: { columns: 2, rows: 1}
                })
            })
        },
        {
            pos: { x: 10, y: 2 },
            width: 20,
            height: 7,
            widget: Rectangle({
                data: Table(() => {
                    const rclMilestones = LegalData.byRoom(this.name)?.rclMilestones ?? {1: Game.time}

                    const milestones = Object.entries(rclMilestones).map(
                        ([rcl, tick]) => {
                            return [
                                rcl,
                                tick - rclMilestones[Math.max(1, parseInt(rcl) - 1)],
                                tick - rclMilestones[1],
                            ]
                        }
                    )

                    if (!(8 in rclMilestones)) {
                        const lastMilestone = Math.max(...(Object.keys(rclMilestones).map(e => parseInt(e)) as number[]));
                        const timeSinceLastMilestone = Game.time - rclMilestones[lastMilestone];

                        const progress = this.controller.progress / this.controller.progressTotal;

                        const timeToNextMilestone = (progress === 0) ? '---' : Math.round((timeSinceLastMilestone / progress) - timeSinceLastMilestone);
                        const eta = (timeToNextMilestone === '---') ? '---' : Game.time + timeToNextMilestone;

                        milestones.push([`${lastMilestone + 1} (est:)`, `+${timeToNextMilestone}`, eta]);
                    }

                    return {
                        data: milestones,
                        config: {
                            headers: ['RCL', 'Ticks', 'Total']
                        }
                    }
                })
            })
        }
    ];

    public get controller() {
        let controller = Controllers.byRoom(this.center.name);
        if (!controller || !(controller instanceof StructureController)) throw new Error(`Could not find controller for office ${this.center.name}`);
        return controller
    }

    constructor(public boardroom: Boardroom, roomName: string) {
        this.name = roomName;
        if (!Game.rooms[roomName]) throw new Error(`Could not find central room for office ${roomName}`);
        let room = RoomData.byRoom(roomName) ?? {name: roomName, scanned: Game.time};
        RoomData.set(roomName, room);
        this.center = room;

        // Name the office, if needed
        this.center.city ??= Memory.cities.shift();

        // Create Managers
        HRManager.register(this);
        LogisticsManager.register(this);

        FacilitiesManager.register(this);
        LegalManager.register(this);
        SalesManager.register(this);
        SecurityManager.register(this);
        LinkManager.register(this);

        // Create Strategists
        LegalStrategist.register(this);
        SalesStrategist.register(this);
        DefenseStrategist.register(this);
        BuildStrategist.register(this);;
        StorageStrategist.register(this);
        SurveyStrategist.register(this);
        SpawnStrategist.register(this);

        this.dashboard = [
            {
                pos: { x: 1, y: 4 },
                width: 48,
                height: 13,
                widget: (this.managers.get('LogisticsManager') as LogisticsManager)?.miniReportBars
            },
            {
                pos: { x: 1, y: 18 },
                width: 15,
                height: 10,
                widget: Rectangle({
                    data: Grid({
                        data: [
                            Bar(() => ({
                                data: {
                                    value: Game.gcl.progress,
                                    maxValue: Game.gcl.progressTotal
                                },
                                config: {
                                    label: `GCL ${Game.gcl.level}`,
                                    style: {fill: 'green', stroke: 'green'}
                                }
                            })),
                            Bar(() => ({
                                data: {
                                    value: this.controller.progress ?? 0,
                                    maxValue: this.controller.progressTotal ?? 0
                                },
                                config: {
                                    label: `RCL ${this.controller.level ?? '-'}`,
                                    style: {fill: 'yellow', stroke: 'yellow'}
                                }
                            })),
                            Bar(() => ({
                                data: {
                                    value: Game.cpu.bucket,
                                    maxValue: 10000
                                },
                                config: {
                                    label: `Bucket`,
                                    style: {fill: 'blue', stroke: 'blue'}
                                }
                            })),
                        ],
                        config: { columns: 3, rows: 1}
                    })
                })
            },
            {
                pos: { x: 1, y: 29 },
                width: 15,
                height: 10,
                widget: Rectangle({ data: (this.managers.get('HRManager') as HRManager)?.miniReport })
            },
        ];
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
        if (global.v.milestones.state) {
            Dashboard({
                widgets: this.milestones,
                config: { room: this.name }
            });
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
        Dashboard({
            widgets: this.dashboard,
            config: { room: this.name }
        });
    }
}

// profiler.registerClass(Office, 'Office');
