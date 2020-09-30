import { deserialize, deserializeArray, serialize } from "class-transformer";
import { Task } from "TaskRequests/Task";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { resolveTaskTrees, TaskPlan } from "TaskRequests/resolveTaskTrees";
import { WithdrawTask } from "TaskRequests/types/WithdrawTask";
import { TransferTask } from "TaskRequests/types/TransferTask";
import { stablematch } from "TaskRequests/algorithms/stablematch";
import { table } from "table";
import { OfficeManager } from "Office/OfficeManager";

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
        if (Memory.tasks[this.office.name]) {
            // Load tasks from Memory
            this.tasks = deserializeArray(Task, Memory.tasks[this.office.name].tasks as string);
            // Load requests from Memory
            let deserialized = JSON.parse(Memory.tasks[this.office.name].requests as string)
            this.requests = {};
            for (let reqType in deserialized) {
                this.requests[reqType] = {};
                for (let reqSource in deserialized[reqType]) {
                    this.requests[reqType][reqSource] = deserialize(TaskRequest, deserialized[reqType][reqSource])
                }
            }
        } else {
            this.tasks = [];
            this.requests = {};
        }
    }
    run() {
        // Assign requests
        let requests = _.shuffle(this.getRequestsFlattened()
            .filter(t => t.task?.valid() && (outputOfTasks(this.getAssociatedTasks(t)) < t.capacity || t.capacity === 0)))

        let priorities = new Map<number, TaskRequest[]>();

        requests.forEach(r =>
            priorities.set(
                r.priority,
                (priorities.get(r.priority) || []).concat(r)
            )
        );
        // Sort requests by priority descending
        [...priorities.keys()].sort((a, b) => (b - a)).forEach(priority => {
            requests = priorities.get(priority) as TaskRequest[];
            let creeps = this.getAvailableCreeps();
            if (creeps.length > 0 && requests.length > 0) {
                this.assignRequestsToCreeps(requests, creeps);
            }
        });


        // Run assigned tasks
        this.tasks = this.tasks.filter(task => {
            if (!task.creep || task.actions.length === 0) return false;
            let result = task.actions[0].action(task.creep)
            if (result === TaskActionResult.SUCCESS) {
                task.actions.shift();
                if (task.actions.length > 0) {
                    task.creep?.say(task.actions[0].message);
                } else {
                    // TODO Should also complete parent request, if capacity is 0.
                    task.completed = true;
                    return false;
                }
            } else if (result === TaskActionResult.FAILED) {
                // Cancel task
                task.completed = true;
                return false;
            }
            return true;
        })
    }
    cleanup() {
        if (!Memory.tasks[this.office.name]) Memory.tasks[this.office.name] = {
            tasks: '',
            requests: ''
        }

        // Write tasks to memory
        Memory.tasks[this.office.name].tasks = serialize(this.tasks
            .filter(task => !task.completed || Game.time > task.created + 500))

        // Write requests to memory
        let serialized: RequestsMap<string> = {};

        for (let reqType in this.requests) {
            serialized[reqType] = {};
            for (let reqSource in this.requests[reqType]) {
                if (this.requests[reqType][reqSource].completed ||
                    !this.requests[reqType][reqSource].task?.valid() ||
                    Game.time > this.requests[reqType][reqSource].created + 500) {
                    // Completed, no longer valid, or timed out
                    delete this.requests[reqType][reqSource]
                } else {
                    // Clean up linked tasks
                    this.requests[reqType][reqSource].assignedTasks = this.requests[reqType][reqSource].assignedTasks.filter(t => !t.completed);
                    serialized[reqType][reqSource] = serialize(this.requests[reqType][reqSource])
                }
            }
        }

        Memory.tasks[this.office.name].requests = JSON.stringify(serialized);
    }

    assignRequestsToCreeps = (requests: TaskRequest[], creeps: Creep[]) => {
        let priorities = stablematch(
            requests,
            creeps,
            (taskRequest, creep) => {
                // if (taskRequest.task?.constructor.name === 'ResupplyTask') console.log('resolving ResupplyTask', creep);
                let paths = resolveTaskTrees({
                    output: 0,
                    creep,
                    capacity: creep.store.getCapacity(),
                    capacityUsed: creep.store.getUsedCapacity(),
                    pos: creep.pos
                }, taskRequest.task as TaskAction)
                let maxOutput = paths?.reduce((max, path) => (Math.max(max, path.minion.output)), 0) || 0;
                let filteredPaths = paths?.filter(c => {
                    // if (taskRequest.task?.constructor.name === 'ResupplyTask') console.log(JSON.stringify(c));
                    // If task plan is null, filter it
                    if (!c) return false;
                    // If task plan has withdraw and transfer loop, filter it
                    let tasks = (c.tasks.filter(t => t instanceof WithdrawTask || t instanceof TransferTask) as (WithdrawTask|TransferTask)[])
                        .map(t => t.destination?.id)
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
                // if (taskRequest.task?.action.constructor.name === 'ResupplyTask') console.log('ResupplyTask', JSON.stringify(bestPlan));
                return {
                    rating: weight * (bestPlan.minion.output/bestPlan.cost), // rating = output/tick, with a bonus if the minion likes the work
                    output: bestPlan
                }
            });
        priorities.forEach(([creep, taskRequest, taskPlan]) => {
            if (!taskPlan) return;
            // console.log(`[TaskManager] Task plan accepted for ${taskPlan.minion.creep} with cost ${taskPlan.cost}:\n` +
            //             `Outcome: [${taskPlan.minion.capacityUsed}/${taskPlan.minion.capacity}] => ${taskPlan.minion.output} at (${JSON.stringify(taskPlan.minion.pos)}) \n` +
            //             `${taskPlan.tasks.map(t => t.toString())}`)
            let task = new Task(taskPlan.tasks, creep, taskRequest.sourceId, taskPlan.cost, taskPlan.minion.output);
            if (taskPlan.minion.output >= taskRequest.capacity) {
                taskRequest.completed = true;
            }
            this.assign(task);
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
        const taskTableRendered = table(taskTable, {
            singleLine: true
        });

        const requestTable = [['Source', 'Action', 'Priority', 'Capacity', 'Assigned', 'Assigned Capacity']];
        let requests = Object.values(this.requests)
            .map(taskType => Object.values(taskType))
            .reduce((a, b) => a.concat(b), [])
        requestTable.push(
            ...requests.map(r => {
                let assignedTasks = this.getAssociatedTasks(r);
                return [
                    Game.getObjectById(r.sourceId as Id<any>)?.toString() || r.sourceId,
                    r.task?.toString(),
                    r.priority,
                    r.capacity,
                    assignedTasks.length,
                    outputOfTasks(assignedTasks)
                ];
            })
        )
        const requestTableRendered = table(requestTable, {
            singleLine: true
        });

        const idleMinions = [
            ['Minion'],
            ...this.getAvailableCreeps().map(creep => [creep.name])
        ];
        const idleMinionsRendered = table(idleMinions, {
            singleLine: true
        });


        console.log(`[TaskManager] Status Report:
    <strong>Tasks</strong>
${taskTableRendered}
    <strong>Requests</strong>
${requestTableRendered}
    <strong>Idle Minions</strong>
${idleMinionsRendered}`
        )
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
