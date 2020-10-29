import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { OfficeManager } from "Office/OfficeManager";
import { Table } from "Visualizations/Table";
import { lazyFilter } from "utils/lazyIterators";

export class OfficeTaskManager extends OfficeManager {
    requests = new Map<string, TaskAction>();
    assignments = new Map<string, TaskAction>();

    submit = (sourceId: string, request: TaskAction) => {
        let key = request.constructor.name + '_' + sourceId;
        let existingRequest = this.requests.get(key);
        if (!existingRequest || request.priority > existingRequest.priority) {
            this.requests.set(key, request);
            for (let [creepName, task] of this.assignments) {
                if (task === existingRequest) {
                    this.assignments.delete(creepName);
                }
            }
        }
    }
    run() {
        // Assign requests
        let priorities = new Map<number, TaskAction[]>();
        let creeps = this.getAvailableCreeps();

        this.requests.forEach(r =>
            priorities.set(
                r.priority,
                (priorities.get(r.priority) || []).concat(r)
            )
        );

        // Sort requests by priority descending
        [...priorities.keys()].sort((a, b) => (b - a)).forEach(priority => {
            let requests = priorities.get(priority) as TaskAction[];
            if (creeps.length > 0 && requests.length > 0) {
                for (let request of requests) {
                    // Only assign creeps up to the capacity limit
                    let capacity = request.capacity;
                    capacity -= Array.from(this.assignments.values()).filter(r => r === request).length;
                    if (capacity <= 0) continue;

                    for (let creep of creeps) {
                        if (request.canBeFulfilledBy(creep)) {
                            this.assignments.set(creep.name, request);
                            capacity -= 1;
                            if (capacity <= 0) break;
                        }
                    }
                    creeps = this.getAvailableCreeps();
                }
            }
        });

        // Run assigned tasks
        for (let [creepName, task] of this.assignments) {
            let creep = global.worldState.myCreeps.byName.get(creepName);
            if (!creep || !task.valid()) {
                this.assignments.delete(creepName);
                continue;
            }

            let result = task.action(creep);
            if (result !== TaskActionResult.INPROGRESS) {
                this.assignments.delete(creepName);
            }
        }
    }

    cleanup() {
        for (let [creepName,task] of this.assignments) {
            if (!task.valid() || !Game.creeps[creepName]) this.assignments.delete(creepName);
        }
        for (let [sourceId,task] of this.requests) {
            if (!task.valid()) this.requests.delete(sourceId);
        }
    }

    isIdle = (creep: CachedCreep) => {
        for (let [c] of this.assignments) {
            if (c === creep.name) return false;
        }
        return true;
    }
    getAvailableCreeps = () => {
        return Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(this.office.name) ?? [],
            c => c.memory.manager === this.constructor.name && this.isIdle(c)
        ))
    }
    report() {
        const taskTable: any[][] = [['Source', 'Task', 'Priority', 'Capacity', 'Assigned Minions']];
        for (let [sourceId, req] of this.requests) {
            let assignedTasks = [...this.assignments.values()].filter(r => r === req);
            taskTable.push([
                sourceId,
                req.constructor.name,
                req.priority,
                req.capacity,
                assignedTasks.length
            ])
        }
        Table(new RoomPosition(0, 40, this.office.center.name), taskTable);

        const idleMinions = [
            ['Minion'],
            ...this.getAvailableCreeps().map(creep => [creep.name])
        ];
        Table(new RoomPosition(40, 40, this.office.center.name), idleMinions);
    }
}
