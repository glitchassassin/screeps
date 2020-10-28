import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";

import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { LogisticsManager } from "./LogisticsManager";
import { MinionRequest } from "MinionRequests/MinionRequest";
import { Table } from "Visualizations/Table";
import { TransferRequest } from "Logistics/LogisticsRequest";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { log } from "utils/logger";
import profiler from "screeps-profiler";

export class HRManager extends OfficeManager {
    requests: {[id: string]: MinionRequest} = {};
    assignments: Map<Id<StructureSpawn>, MinionRequest> = new Map();

    submit = (request: MinionRequest) => {
        if (!request.sourceId) return;
        if (!this.requests[request.sourceId]) {
            this.requests[request.sourceId] = request;
        }
    }

    plan() {
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        // Enroll any newly hired creeps, if they are not already on the list

        let priority = 5;

        switch (this.status) {
            case OfficeManagerStatus.MINIMAL:
                priority = 6;
                break;
            case OfficeManagerStatus.NORMAL:
                priority = 7;
                break;
            case OfficeManagerStatus.PRIORITY:
                priority = 8;
                break;
        }

        // Scale priority of spawn energy based on requests in queue
        priority += Object.keys(this.requests).length / 2

        for (let e of hrAnalyst.getExtensions(this.office)) {
            let energy = getTransferEnergyRemaining(e);
            if (energy && energy > 0) {
                logisticsManager.submit(e.id, new TransferRequest(e, priority));
            }
        }
        for (let spawn of hrAnalyst.getSpawns(this.office)) {
            let spawnCapacity = getTransferEnergyRemaining(spawn);
            if (!spawnCapacity) return;
            if (spawnCapacity > 0) {
                logisticsManager.submit(spawn.id, new TransferRequest(spawn, priority));
            }
        }
    }
    run() {
        // Spawn Requests
        let assignedRequests = Array.from(this.assignments.values())

        Object.values(this.requests)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            log('HRManager', `Has priority ${r.priority} request`)
            if (!assignedRequests.includes(r)) {
                // Find a spawn to carry out the request
                let available = this.getIdleSpawn(r.priority);
                if (available) {
                    log('HRManager', `Assigning priority ${r.priority} request to ${available}`)
                    this.assignments.set(available.id, r);
                } else {
                    log('HRManager', `No spawn avilable for priority ${r.priority} request`)
                }
            }
        })
        // Process assigned requests
        this.assignments.forEach((request, spawnId) => {
            let spawn = Game.getObjectById(spawnId);
            if (!spawn || this.assignments.get(spawnId)?.completed === true) {
                log('HRManager', `Cancelling assignment for ${request.priority} request (completed: ${this.assignments.get(spawnId)?.completed})`)
                this.assignments.delete(spawnId);
                return;
            }
            log('HRManager', `Fulfilling priority ${request.priority} request`)
            request.fulfill(spawn)
        })

        if (global.v.hr.state) {
            this.report();
        }
    }
    cleanup() {
        Object.entries(this.requests).forEach(([sourceId, request]) => {
            if (this.requests[sourceId].completed) {
                delete this.requests[sourceId];
            }
        })
    }
    report() {
        let employeeData = new Map<string, number>();
        this.office.employees.forEach(e => {
            let t = e.memory.type || 'NONE'
            employeeData.set(t, (employeeData.get(t) || 0) + 1);
        })
        let employeeTable = [
            ['Role', 'Count'],
            ...employeeData.entries()
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), employeeTable);

        let headers = ['Source', 'Role', 'Priority', 'Assigned']
        let requests = Object.values(this.requests)
        let rows = requests.map(r => {
            let assignment = [...this.assignments.entries()].find(([id, request]) => request === r)
            return [
                Game.getObjectById(r.sourceId as Id<any>)?.toString() || r.sourceId,
                r.type,
                r.priority,
                assignment?.[0] ?? ''
            ];
        });
        Table(new RoomPosition(15, 2, this.office.center.name), [headers, ...rows]);
    }

    miniReport(pos: RoomPosition) {
        let employeeTypes = new Set<string>();
        let employeeCounts = new Map<string, number>();
        let spawnStatus = new Map<string, string>();
        this.office.employees.forEach(e => {
            let t = e.memory.type || 'NONE'
            employeeTypes.add(t);
            employeeCounts.set(t, (employeeCounts.get(t) || 0) + 1);
        })
        for (let req in this.requests) {
            let t = this.requests[req].type ?? 'NONE';
            let assignment = [...this.assignments.entries()].find(([id, request]) => request === this.requests[req])
            employeeTypes.add(t);
            if (assignment) {
                spawnStatus.set(t, 'SPAWNING');
            } else if (!spawnStatus.has(t)) {
                spawnStatus.set(t, 'QUEUED');
            }
        }
        let employeeTable = [
            ['Role', 'Count', 'Queue'],
            ...[...employeeTypes.values()].map(t => [t, employeeCounts.get(t) ?? 0, spawnStatus.get(t) ?? ''])
        ]
        Table(new RoomPosition(pos.x, pos.y, this.office.center.name), employeeTable);
    }

    getIdleSpawn = (priority: number) => {
        for (let spawn of this.worldState.mySpawns.byRoom.get(this.office.center.name) ?? []) {
            let request = this.assignments.get(spawn.id)
            if (!request || request.priority < priority) {
                return spawn;
            }
        }
        return undefined;
    }
}
profiler.registerClass(HRManager, 'HRManager');
