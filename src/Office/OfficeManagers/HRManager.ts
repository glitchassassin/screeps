import { Bar, Meters } from "Visualizations/Meters";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { Request } from "BehaviorTree/Request";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { Table } from "Visualizations/Table";
import profiler from "screeps-profiler";

export class HRManager extends OfficeManager {
    requests: Request<StructureSpawn>[] = [];

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
            this.report();
        }
    }

    getAvailableSpawns() {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst
        let busySpawns = this.requests.flatMap(r => r.assigned);
        return hrAnalyst.getSpawns(this.office).filter(c => !c.spawning && !busySpawns.includes(c.id))
    }

    report() {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst
        let employeeData = new Map<string, number>();

        for (let e of hrAnalyst.getEmployees(this.office)) {
            let t = e.memory.type || 'NONE'
            employeeData.set(t, (employeeData.get(t) || 0) + 1);
        }
        let employeeTable = [
            ['Role', 'Count'],
            ...employeeData.entries()
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), employeeTable);

        const taskTable: any[][] = [['Request', 'Priority', 'Assigned Spawns']];
        for (let req of this.requests) {
            taskTable.push([
                (req as SpawnRequest).type,
                req.priority,
                req.assigned.length
            ])
        }
        Table(new RoomPosition(0, 40, this.office.center.name), taskTable);

        let metrics = statisticsAnalyst.metrics.get(this.office.name);

        let lastRoomEnergyLevel = metrics?.roomEnergyLevels.values[metrics?.roomEnergyLevels.values.length - 1] || 0

        let chart = new Meters([
            new Bar('HR', {fill: 'magenta', stroke: 'magenta'}, lastRoomEnergyLevel, metrics?.roomEnergyLevels.max()),
        ])

        chart.render(new RoomPosition(2, 10, this.office.center.name));
    }

    miniReport(pos: RoomPosition) {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst
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
        let employeeTable = [
            ['Role', 'Count', 'Queue'],
            ...[...employeeTypes.values()].map(t => [t, employeeCounts.get(t) ?? 0, spawnStatus.get(t) ?? ''])
        ]
        Table(new RoomPosition(pos.x, pos.y, this.office.center.name), employeeTable);
    }
}
profiler.registerClass(HRManager, 'HRManager');
