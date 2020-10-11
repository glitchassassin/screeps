import { OfficeManager } from "Office/OfficeManager";
import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";
import { Table } from "Visualizations/Table";

export class OfficeTaskManager extends OfficeManager {
    requests = new Map<string, TaskAction>();
    assignments = new Map<Id<Creep>, TaskAction>();

    submit = (sourceId: string, request: TaskAction) => {
        let key = request.constructor.name + '_' + sourceId;
        let existingRequest = this.requests.get(key);
        if (!existingRequest || request.priority > existingRequest.priority) {
            this.requests.set(key, request);
            for (let [creepId, task] of this.assignments) {
                if (task === existingRequest) {
                    this.assignments.delete(creepId);
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
                    for (let creep of creeps) {
                        if (request.canBeFulfilledBy(creep)) {
                            this.assignments.set(creep.id, request);
                        }
                    }
                }
            }
        });

        // Run assigned tasks
        for (let [creepId, task] of this.assignments) {
            let creep = Game.getObjectById(creepId)
            if (!creep || !task.valid()) {
                this.assignments.delete(creepId);
                continue;
            }

            let result = task.action(creep);
            if (result !== TaskActionResult.INPROGRESS) {
                this.assignments.delete(creepId);
            }
        }
    }

    cleanup() {
        for (let [creepId,task] of this.assignments) {
            if (!task.valid()) this.assignments.delete(creepId);
        }
    }

    isIdle = (creep: Creep) => {
        for (let [c] of this.assignments) {
            if (c === creep.id) return false;
        }
        return true;
    }
    getAvailableCreeps = () => {
        return this.office.employees.filter(c => c.memory.manager === this.constructor.name && this.isIdle(c))
    }
    report() {
        const taskTable = [['Source', 'Task', 'Assigned Minions']];
        for (let [sourceId, req] of this.requests) {
            let assignedTasks = [...this.assignments.values()].filter(r => r === req);
            taskTable.push([
                sourceId,
                req.constructor.name,
                assignedTasks.length.toFixed(0)
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
