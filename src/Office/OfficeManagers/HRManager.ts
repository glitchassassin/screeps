import { Bar, Dashboard, Label, LineChart, Metrics, Rectangle, Table } from "screeps-viz";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { PROFILE } from "config";
import { Request } from "BehaviorTree/Request";
import SpawnPressure from "Reports/widgets/SpawnPressure";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import profiler from "screeps-profiler";

export class HRManager extends OfficeManager {
    requests: Request<StructureSpawn>[] = [];
    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 3,
            widget: Rectangle({ data: Label({
                data: 'HR Manager Report',
                config: { style: { font: 1.4 } }
            }) })
        },
        {
            pos: { x: 1, y: 5 },
            width: 47,
            height: 13,
            widget: Rectangle({ data: LineChart(() => {
                let statisticsAnalyst = this.office.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst
                return {
                    data: {
                        spawnCapacity: Metrics.tail(statisticsAnalyst.metrics.get(this.office.name)!.roomEnergyLevels, 100)
                    },
                    config:  {
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
                    }
                }
            }) })
        },
        {
            pos: { x: 42, y: 19 },
            width: 5,
            height: 10,
            widget: Rectangle({ data: Bar(() => {
                let statisticsAnalyst = this.office.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst
                let stats = statisticsAnalyst.metrics.get(this.office.name);
                let lastRoomEnergyLevel = Metrics.last(stats!.roomEnergyLevels)
                return {
                    data: {
                        value: lastRoomEnergyLevel[1],
                        targetValue: Metrics.max(stats!.roomEnergyLevels)[1],
                        maxValue: Game.rooms[this.office.name].energyCapacityAvailable
                    },
                    config: {
                        style: {
                            fill: 'magenta',
                            stroke: 'magenta'
                        }
                    }
                }
            }) })
        },
        {
            pos: { x: 1, y: 19 },
            width: 30,
            height: 10,
            widget: Rectangle({ data: Table(() => {
                return {
                    data: this.requests.map(req => ([
                        (req as SpawnRequest).type,
                        req.priority,
                        req.assigned.length
                    ])),
                    config: {
                        headers: ['Request', 'Priority', 'Assigned Spawns']
                    }
                }
            }) })
        },
        {
            pos: { x: 1, y: 30 },
            width: 47,
            height: 10,
            widget: SpawnPressure(this.office)
        },
    ];

    miniReport = Table(() => {
        let employeeTypes = new Set<string>();
        let employeeCounts = new Map<string, number>();
        let spawnStatus = new Map<string, string>();
        HRAnalyst.getEmployees(this.office).forEach(e => {
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
        return {
            data: [...employeeTypes.values()].map(t => [t, employeeCounts.get(t) ?? 0, spawnStatus.get(t) ?? '']),
            config: {
                headers: ['Role', 'Count', 'Queue']
            }
        }
    })

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
            Dashboard({
                widgets: this.dashboard,
                config: {
                    room: this.office.name
                }
            })
        }
    }

    getAvailableSpawns() {
        let busySpawns = this.requests.flatMap(r => r.assigned);
        return HRAnalyst.getSpawns(this.office).filter(c => !c.spawning && !busySpawns.includes(c.id))
    }
}

if (PROFILE.managers) profiler.registerClass(HRManager, 'HRManager');
