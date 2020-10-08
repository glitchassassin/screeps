import { Metric } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { Task } from "TaskRequests/Task";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { DepotTask } from "TaskRequests/types/DepotTask";
import { log } from "utils/logger";
import { Table } from "Visualizations/Table";

type RequestsMap<T> = {
    [id: string]: {
        [id: string]: T
    }
}

function outputOfTasks(tasks: Task[]) {
    return tasks.reduce((a, b) => a + b.output, 0);
}

export class TaskManager extends OfficeManager {
    assignments = new Map<TaskAction, Creep>();
    requests = new Map<string, TaskAction>();

    purge = () => {
        this.requests = new Map<string, TaskAction>();
        this.assignments = new Map<TaskAction, Creep>();
    }

    submit = (sourceId: string, request: TaskAction) => {
        let key = request.constructor.name + '_' + sourceId;
        let existingRequest = this.requests.get(key);
        if (!existingRequest || request.priority > existingRequest.priority) {
            this.requests.set(key, request);
            if (existingRequest) {
                this.assignments.delete(existingRequest);
            }
        }
    }
    run() {
        global.reportCPU('TaskManager run');
        // Assign requests
        let priorities = new Map<number, TaskAction[]>();
        // FIX availableCreeps
        // Then pick up at assigning tasks to creeps
        let availableCreeps = this.getAvailableCreeps();

        this.requests.forEach(r =>
            priorities.set(
                r.priority,
                (priorities.get(r.priority) || []).concat(r)
            )
        );
        global.reportCPU('TaskManager requests prepared');
        // Sort requests by priority descending
        [...priorities.keys()].sort((a, b) => (b - a)).forEach(priority => {
            let requests = priorities.get(priority) as TaskAction[];
            let creeps = this.getAvailableCreeps();
            if (creeps.length > 0 && requests.length > 0) {
                log('TaskManager', `Assigning ${requests.length} tasks of priority ${priority} to ${creeps.length} available minions`)
                for (let request of requests) {
                    if
                }
            }
        });
        global.reportCPU('TaskManager requests assigned');


        let cpuDiagnostics = new Map<string, Metric>();
        // Run assigned tasks
        this.tasks = this.tasks.filter(task => {
            if (!task.creep || task.actions.length === 0) return false;
            if (task.actions[0] instanceof DepotTask) {
                let originatingRequest = task.sourceId?.replace('_depot', '');
                if (originatingRequest && !this.hasTaskFor(originatingRequest)) {
                    log('TaskManager', `canceling DepotTask as parent request ${originatingRequest} is unassigned`);
                    return false;
                }
            }
            let action = task.actions[0];
            // CPU Debug
            let metric = cpuDiagnostics.get(action.constructor.name) ?? new Metric(20, 50)
            cpuDiagnostics.set(action.constructor.name, metric);
            let cpuStart = Game.cpu.getUsed();
            // End CPU Debug
            let result = action.action(task.creep)
            // CPU Debug
            metric.update(Game.cpu.getUsed() - cpuStart);
            // End CPU Debug
            if (result === TaskActionResult.SUCCESS) {
                task.actions.shift();
                if (task.actions.length > 0) {
                    task.creep?.say(task.actions[0].message);
                } else {
                    if (action && task.sourceId) {
                        let request = this.requests[action.constructor.name]?.[task.sourceId];
                        if (request && request.capacity <= 0) request.completed = true;
                    }
                    task.completed = true;
                    return false;
                }
            } else if (result === TaskActionResult.FAILED) {
                // console.log(`<span style="color: white">[ <span style="color: red">FAILED</span> ] ${task.actions[0].toString()} ${task.creep.toString()} </span>`)
                // Cancel task
                if (action && task.sourceId) {
                    let request = this.requests[action.constructor.name]?.[task.sourceId];
                    if (request && request.capacity <= 0) request.completed = true;
                }
                task.completed = true;
                return false;
            }
            return true;
        });
        [...cpuDiagnostics.entries()].sort(([a_name, a_metric], [b_name, b_metric]) => a_metric.mean() - b_metric.mean()).forEach(([action, metric]) => {
            log('TaskManagerCPU', `[${action.padEnd(15)}] Average: ${metric.mean().toFixed(3)} Max: ${metric.max().toFixed(3)} Min: ${metric.min().toFixed(3)} Count: ${metric.values.length}`);
        })
        global.reportCPU('TaskManager tasks run');

        if (global.v.task.state) {
            this.report();
        }
    }

    cleanup() {
        for (let reqType in this.requests) {
            for (let reqSource in this.requests[reqType]) {
                let request = this.requests[reqType][reqSource];
                if (
                    request.completed ||
                    !request.task?.valid() ||
                    request.capacity <= 0
                ) {
                    this.requests[reqType][reqSource].completed = true;
                    delete this.requests[reqType][reqSource];
                }
            }
        }
    }

    assignRequestsToCreeps = (requests: TaskRequest[], creeps: Creep[]) => {
        priorities.forEach(([taskRequest, creep, taskPlan]) => {
            if (!taskPlan) return;
            log('TaskManager', `[TaskManager] Task plan accepted for ${taskPlan.minion.creep} with cost ${taskPlan.cost}:\n` +
                        `Outcome: [${taskPlan.minion.capacityUsed}/${taskPlan.minion.capacity}] => ${taskPlan.minion.output} at (${JSON.stringify(taskPlan.minion.pos)}) \n` +
                        `${taskPlan.tasks.map(t => t.toString())}`)
            let task = new Task(taskPlan.tasks, creep, taskRequest.sourceId, taskPlan.cost, taskPlan.minion.output);
            taskRequest.capacity -= taskPlan.minion.output;
            if (taskRequest.capacity <= 0) {
                taskRequest.completed = true;
            }
            this.assign(task);
            // If necessary, create Depot request for assigned tasks.
            if (taskRequest.depot) {
                let depotRequest = new TaskRequest(taskRequest.sourceId + "_depot", new DepotTask(taskRequest.depot, taskRequest.capacity), taskRequest.priority, taskRequest.capacity);
                this.submit(depotRequest)
            }
        })
    }
    isIdle = (creep: Creep) => {
        return !this.tasks.some(t => t.creep?.id === creep.id);
    }
    getAvailableCreeps = () => {
        return this.office.employees.filter(c => !c.memory.ignoresRequests && )
    }
    hasTaskFor = (id: string) => {
        return this.tasks.some(t => t.sourceId === id);
    }
    hasRequestFor = (id: string) => {
        for (let reqType in this.requests) {
            for (let reqSource in this.requests[reqType]) {
                if (this.requests[reqType][reqSource].sourceId === id) {
                    return true;
                }
            }
        }
        return false;
    }
    getRequestsFlattened() {
        return Object.values(this.requests)
            .map(taskType => Object.values(taskType))
            .reduce((a, b) => a.concat(b), [])
    }
    getAssociatedTasks(request: TaskRequest) {
        return this.tasks.filter(task => (
            task.actions[task.actions.length -1]?.constructor.name === request.task?.constructor.name &&
            task.sourceId === request.sourceId
        ))
    }
    report() {
        const taskTable = [['Source', 'Goal', 'Current Step', 'Minion', 'Predicted Cost']];
        taskTable.push(
            ...this.tasks.map(t => ([
                Game.getObjectById(t.sourceId as Id<any>)?.toString() || t.sourceId,
                t.actions[t.actions.length - 1].toString(),
                t.actions[0].toString(),
                t.creep?.name || '',
                t.cost
            ]))
        )
        // Table(new RoomPosition(0, 0, this.office.center.name), taskTable);

        const requestTable = [['Source', 'Action', 'Priority', 'Capacity', 'Assigned', 'Depot', 'Assigned Output']];
        let requests = Object.values(this.requests)
            .map(taskType => Object.values(taskType))
            .reduce((a, b) => a.concat(b), [])
        requestTable.push(
            ...requests.map(r => {
                let assignedTasks = this.getAssociatedTasks(r);
                return [
                    r.sourceId ?? '',
                    r.task?.toString() ?? '',
                    r.priority.toFixed(0) ?? '',
                    r.capacity.toFixed(0) ?? '',
                    assignedTasks.length.toFixed(0),
                    r.depot ? 'Yes' : '',
                    outputOfTasks(assignedTasks).toFixed(0) ?? ''
                ];
            })
        )
        Table(new RoomPosition(0, 0, this.office.center.name), requestTable);

        const idleMinions = [
            ['Minion'],
            ...this.getAvailableCreeps().map(creep => [creep.name])
        ];
        Table(new RoomPosition(0, 40, this.office.center.name), idleMinions);
    }
}

global.taskReport = () => {
    global.boardroom.offices.forEach(office => {
        let t = office.managers.get('TaskManager') as TaskManager;
        t.report();
    })
}
global.taskPurge = () => {
    global.boardroom.offices.forEach(office => {
        let t = office.managers.get('TaskManager') as TaskManager;
        t.purge();
    })
}
