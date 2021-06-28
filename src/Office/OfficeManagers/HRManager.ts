import { Bar, Dashboard, Label, LineChart, Metrics, Rectangle, Table } from "screeps-viz";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { Office } from "Office/Office";
import { OfficeManager } from "Office/OfficeManager";
import { Request } from "BehaviorTree/Request";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import profiler from "screeps-profiler";

export class HRManager extends OfficeManager {
    requests: Request<StructureSpawn>[] = [];
    dashboard = Dashboard({});

    miniReport = Table(() => []);

    constructor(office: Office) {
        super(office);

        let hrAnalyst = this.office.boardroom.managers.get('HRAnalyst') as HRAnalyst
        let statisticsAnalyst = this.office.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst

        this.dashboard = Dashboard({ room: this.office.name, widgets: [
            {
                pos: { x: 1, y: 1 },
                width: 47,
                height: 3,
                widget: Rectangle(Label(() => 'HR Manager Report', { style: { font: 1.4 } }))
            },
            {
                pos: { x: 1, y: 5 },
                width: 47,
                height: 13,
                widget: Rectangle(LineChart(() => {
                    return {
                        spawnCapacity: Metrics.granularity(statisticsAnalyst.metrics.get(this.office.name)!.roomEnergyLevels, 20)
                    }
                }, {
                    scale: {
                        y: {
                            min: 0,
                            max: Game.rooms[this.office.name].energyCapacityAvailable
                        }
                    },
                    series: {
                        spawnCapacity: {
                            label: 'Spawn Capacity',
                            color: 'magenta'
                        }
                    }
                }))
            },
            {
                pos: { x: 32, y: 35 },
                width: 5,
                height: 10,
                widget: Rectangle(Bar(() => {
                    let stats = statisticsAnalyst.metrics.get(this.office.name);
                    let lastRoomEnergyLevel = Metrics.last(stats!.roomEnergyLevels)
                    return {
                        value: lastRoomEnergyLevel[1],
                        targetValue: Metrics.max(stats!.roomEnergyLevels)[1],
                        maxValue: Game.rooms[this.office.name].energyCapacityAvailable
                    }
                }, {
                    style: {
                        fill: 'magenta',
                        stroke: 'magenta'
                    }
                }))
            },
            {
                pos: { x: 1, y: 19 },
                width: 30,
                height: 30,
                widget: Rectangle(Table(() => {
                    return this.requests.map(req => ([
                        (req as SpawnRequest).type,
                        req.priority,
                        req.assigned.length
                    ]));
                }, {
                    headers: ['Request', 'Priority', 'Assigned Spawns']
                }))
            },
            {
                pos: { x: 32, y: 19 },
                width: 16,
                height: 15,
                widget: Rectangle(Table(() => {
                    let employeeData = new Map<string, number>();

                    for (let e of hrAnalyst.getEmployees(this.office)) {
                        let t = e.memory.type || 'NONE'
                        employeeData.set(t, (employeeData.get(t) || 0) + 1);
                    }

                    return [...employeeData.entries()];
                }, {
                    headers: ['Role', 'Count']
                }))
            },
        ]});

        profiler.registerFN(this.dashboard, 'hrDashboard');

        this.miniReport = Table(() => {
            hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst
            let employeeTypes = new Set<string>();
            let employeeCounts = new Map<string, number>();
            let spawnStatus = new Map<string, string>();
            hrAnalyst.getEmployees(this.office).forEach(e => {
                let t = e.memory.type || 'NONE'
                employeeTypes.add(t);
                employeeCounts.set(t, (employeeCounts.get(t) || 0) + 1);
            })
            for (let req of this.requests) {
                if (req instanceof SpawnRequest) {
                    employeeTypes.add(req.type);
                    if (req.assigned.length > 0) {
                        spawnStatus.set(req.type, 'SPAWNING');
                    } else {
                        spawnStatus.set(req.type, 'QUEUED');
                    }
                }
            }
            return [...employeeTypes.values()].map(t => [t, employeeCounts.get(t) ?? 0, spawnStatus.get(t) ?? ''])
        }, {
            headers: ['Role', 'Count', 'Queue']
        })
    }

    submit = (request: Request<StructureSpawn>) => {
        this.requests.push(request);
    }
    run() {
        // Sort requests by priority descending
        this.requests.sort((a, b) => a.priority - b.priority);

        // Assign requests
        for (let request of this.requests) {
            // Only assign spawns up to the capacity limit
            if (request.capacityMet()) continue;

            let spawns = this.getAvailableSpawns();
            if (spawns.length === 0) break;

            for (let spawn of spawns) {
                let result = request.assign(spawn);
                if (request.capacityMet()) break;
            }
        }

        // Run assigned tasks
        this.requests = this.requests.filter(request => {
            if (request.assigned.length === 0) return true; // Unassigned


            let result = request.run();
            if (result !== BehaviorResult.INPROGRESS) return false;
            return true;
        });


        if (global.v.hr.state) {
            this.dashboard();
        }
    }

    getAvailableSpawns() {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst
        let busySpawns = this.requests.flatMap(r => r.assigned);
        return hrAnalyst.getSpawns(this.office).filter(c => !c.spawning && !busySpawns.includes(c.id))
    }
}
// profiler.registerClass(HRManager, 'HRManager');
