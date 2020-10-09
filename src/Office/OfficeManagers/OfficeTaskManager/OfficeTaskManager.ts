import { OfficeManager } from "Office/OfficeManager";
import { TaskAction } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

export class OfficeTaskManager extends OfficeManager {
    requests = new Map<string, TaskAction>();
    assignments = new Map<Creep, TaskAction>();

    submit = (sourceId: string, request: TaskAction) => {
        let key = request.constructor.name + '_' + sourceId;
        let existingRequest = this.requests.get(key);
        if (!existingRequest || request.priority > existingRequest.priority) {
            this.requests.set(key, request);
            for (let [creep, task] of this.assignments) {
                if (task === existingRequest) {
                    this.assignments.delete(creep);
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
                            this.assignments.set(creep, request);
                        }
                    }
                }
            }
        });

        // Run assigned tasks
        for (let [creep, task] of this.assignments) {
            if (!task.valid()) this.assignments.delete(creep);

            task.action(creep);
        }
    }

    cleanup() {
        for (let [creep,task] of this.assignments) {
            if (!task.valid()) this.assignments.delete(creep);
        }
    }

    isIdle = (creep: Creep) => {
        for (let [c] of this.assignments) {
            if (c === creep) return false;
        }
        return true;
    }
    getAvailableCreeps = () => {
        return this.office.employees.filter(c => !c.memory.ignoresRequests && this.isIdle(c))
    }
}
