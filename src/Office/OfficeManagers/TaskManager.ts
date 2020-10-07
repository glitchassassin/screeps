import { Metric } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { stablematch } from "TaskRequests/algorithms/stablematch";
import { resolveTaskTrees } from "TaskRequests/resolveTaskTrees";
import { Task } from "TaskRequests/Task";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { DepotTask } from "TaskRequests/types/DepotTask";
import { TransferTask } from "TaskRequests/types/TransferTask";
import { WithdrawTask } from "TaskRequests/types/WithdrawTask";
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
    tasks: Task[] = [];
    requests: RequestsMap<TaskRequest> = {};

    purge = () => {
        this.requests = {};
        this.tasks = [];
        if (Memory.tasks[this.office.name]) {
            Memory.tasks[this.office.name].tasks = "";
            Memory.tasks[this.office.name].requests = "";
        }
    }

    submit = (request: TaskRequest) => {
        if (!request.sourceId || !request.task) return;
        if (this.requests[request.task.constructor.name] === undefined) {
            this.requests[request.task.constructor.name] = {};
        }
        this.requests[request.task.constructor.name][request.sourceId] = request;
    }
    assign = (task: Task) => {
        task.creep?.say(task.actions[0].message);
        this.tasks.push(task);
    }
    init() {
        // try {
        //     // Load tasks from Memory
        //     this.tasks = deserializeArray(Task, Memory.tasks[this.office.name].tasks as string);
        //     // Load requests from Memory
        //     let deserialized = JSON.parse(Memory.tasks[this.office.name].requests as string)
        //     this.requests = {};
        //     for (let reqType in deserialized) {
        //         this.requests[reqType] = {};
        //         for (let reqSource in deserialized[reqType]) {
        //             this.requests[reqType][reqSource] = deserialize(TaskRequest, deserialized[reqType][reqSource])
        //         }
        //     }
        // } catch {
            this.tasks = [];
            this.requests = {};
        // }
    }
    run() {
        global.reportCPU('TaskManager run');
        // Assign requests
        let requests = this.getRequestsFlattened()

        let priorities = new Map<number, TaskRequest[]>();

        requests.forEach(r =>
            priorities.set(
                r.priority,
                (priorities.get(r.priority) || []).concat(r)
            )
        );
        global.reportCPU('TaskManager requests prepared');
        // Sort requests by priority descending
        [...priorities.keys()].sort((a, b) => (b - a)).forEach(priority => {
            requests = priorities.get(priority) as TaskRequest[];
            let creeps = this.getAvailableCreeps();
            if (creeps.length > 0 && requests.length > 0) {
                log('TaskManager', `Assigning ${requests.length} tasks of priority ${priority} to ${creeps.length} available minions`)
                this.assignRequestsToCreeps(requests, creeps);
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
                    task.actions[0].cancel(task.creep);
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
        let priorities = stablematch(
            requests,
            creeps,
            (taskRequest, creep) => {
                // if (taskRequest.task?.constructor.name === 'BuildTask') console.log('resolving BuildTask', creep);
                let paths = resolveTaskTrees({
                    output: 0,
                    creep,
                    capacity: creep.store.getCapacity(),
                    capacityUsed: creep.store.getUsedCapacity(),
                    pos: creep.pos
                }, taskRequest.task as TaskAction)
                let maxOutput = paths?.reduce((max, path) => (Math.max(max, path.minion.output)), 0) || 0;
                let filteredPaths = paths?.filter(c => {
                    // if (taskRequest.task?.constructor.name === 'BuildTask') console.log(JSON.stringify(c));
                    // If task plan is null, filter it
                    if (!c) return false;
                    // If task plan has withdraw and transfer loop, filter it
                    let tasks = (c.tasks.filter(t => t instanceof WithdrawTask || t instanceof TransferTask) as (WithdrawTask|TransferTask)[])
                        .map(t => t instanceof WithdrawTask ? t.destination?.pos.toString() : t.destination?.toString())
                    if (tasks.length !== new Set(tasks).size) return false;
                    // If task plan has no useful output, or another task plan has higher output, filter it
                    if (c.minion.output === 0 || c.minion.output < maxOutput) return false;
                    // Otherwise, accept it
                    return true;
                })

                if (!filteredPaths || filteredPaths.length === 0) {
                    return {rating: Infinity, output: null};
                }
                let bestPlan = filteredPaths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                let weight = (taskRequest.task && creep.memory.favoredTasks?.includes(taskRequest.task?.action.constructor.name)) ? 2 : 1;
                // if (taskRequest.task?.action.constructor.name === 'BuildTask') console.log('BuildTask', JSON.stringify(bestPlan));
                return {
                    rating: weight * (bestPlan.minion.output/bestPlan.cost), // rating = output/tick, with a bonus if the minion likes the work
                    output: bestPlan
                }
            });
        priorities.forEach(([creep, taskRequest, taskPlan]) => {
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
        return this.office.employees.filter(c => !c.memory.ignoresRequests && this.isIdle(c))
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
        Table(new RoomPosition(0, 0, this.office.center.name), taskTable);

        const requestTable = [['Source', 'Action', 'Priority', 'Capacity', 'Assigned', 'Depot']];
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
                    // outputOfTasks(assignedTasks).toFixed(0) ?? ''
                ];
            })
        )
        Table(new RoomPosition(0, 25, this.office.center.name), requestTable);

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
