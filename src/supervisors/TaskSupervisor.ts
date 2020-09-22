import { deserialize, deserializeArray, serialize } from "class-transformer";
import { Task } from "tasks/Task";
import { TaskAction } from "tasks/TaskAction";
import { TaskRequest } from "tasks/TaskRequest";
import { resolveTaskTrees, TaskPlan } from "tasks/resolveTaskTrees";
import { Manager } from "../managers/Manager";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { TransferTask } from "tasks/types/TransferTask";
import { stablematch } from "algorithms/stablematch";
import { table } from "table";

type RequestsMap<T> = {
    [id: string]: {
        [id: string]: T
    }
}

function outputOfTasks(tasks: Task[]) {
    return tasks.reduce((a, b) => a + b.output, 0);
}

export class TaskSupervisor extends Manager {
    tasks: Task[] = [];
    requests: RequestsMap<TaskRequest> = {};
    disabled = false; // Used for debugging task CPU overload

    purge = (room: string) => {
        this.requests = {};
        this.tasks = [];
        if (Memory.rooms[room]) {
            Memory.rooms[room].tasks = "";
            Memory.rooms[room].requests = "";
        }
    }

    submit = (request: TaskRequest) => {
        if (!request.sourceId || !request.task) return;
        if (this.requests[request.task.constructor.name] === undefined) {
            this.requests[request.task.constructor.name] = {};
        }
        if (!this.requests[request.task.constructor.name][request.sourceId] ||
            this.requests[request.task.constructor.name][request.sourceId].priority < request.priority) {
            this.requests[request.task.constructor.name][request.sourceId] = request;
        }
    }
    assign = (task: Task) => {
        task.creep?.say(task.actions[0].message);
        this.tasks.push(task);
    }
    load = (room: Room) => {
        if (this.disabled) return;
        // Load tasks from Memory
        if (Memory.rooms[room.name]?.tasks) {
            this.tasks = deserializeArray(Task, Memory.rooms[room.name]?.tasks as string);
        } else {
            this.tasks = [];
        }
        // Load requests from Memory
        if (Memory.rooms[room.name]?.requests) {
            let deserialized = JSON.parse(Memory.rooms[room.name]?.requests as string)
            for (let reqType in deserialized) {
                this.requests[reqType] = {};
                for (let reqSource in deserialized[reqType]) {
                    this.requests[reqType][reqSource] = deserialize(TaskRequest, deserialized[reqType][reqSource])
                }
            }
        } else {
            this.requests = {};
        }
    }
    run = (room: Room) => {
        if (this.disabled) return;
        // Assign requests
        let requests = _.shuffle(Object.values(this.requests)
            .map(taskType => Object.values(taskType))
            .reduce((a, b) => a.concat(b), [])
            .filter(t => t.task?.valid() && outputOfTasks(this.getAssociatedTasks(t)) < t.capacity))

        let priorities = new Map<Number, TaskRequest[]>();
        // Sort requests by priority
        requests.forEach(r =>
            priorities.set(
                r.priority,
                (priorities.get(r.priority) || []).concat(r)
            )
        );

        priorities.forEach(requests => {
            let creeps = this.getAvailableCreeps(room);
            if (creeps.length > 0 && requests.length > 0) {
                this.assignRequestsToCreeps(requests, creeps);
            }
        });


        // Run assigned tasks
        this.tasks = this.tasks.filter(task => {
            if (!task.creep) return false; // Creep disappeared, cancel task
            let result = task.actions[0].action(task.creep)
            if (result) {
                task.actions.shift();
                if (task.actions.length > 0) {
                    task.creep?.say(task.actions[0].message);
                } else {
                    task.completed = true;
                    return false;
                }
            }
            return true;
        })
    }
    cleanup = (room: Room) => {
        if (this.disabled) return;
        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = { }
        Memory.rooms[room.name].tasks = serialize(this.tasks
            .filter(task => !task.completed || Game.time > task.created + 500))

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

        Memory.rooms[room.name].requests = JSON.stringify(serialized);
    }

    assignRequestsToCreeps = (requests: TaskRequest[], creeps: Creep[]) => {
        let priorities = stablematch(
            requests,
            creeps,
            (taskRequest, creep) => {
                let paths = resolveTaskTrees({
                    output: 0,
                    creep,
                    capacity: creep.store.getCapacity(),
                    capacityUsed: creep.store.getUsedCapacity(),
                    pos: creep.pos
                }, taskRequest.task as TaskAction)
                let filteredPaths = paths?.filter(c => {
                    // If task plan is null, filter it
                    if (!c) return false;
                    // If task plan has withdraw and transfer loop, filter it
                    let tasks = (c.tasks.filter(t => t instanceof WithdrawTask || t instanceof TransferTask) as (WithdrawTask|TransferTask)[])
                        .map(t => t.destination?.id)
                    if (tasks.length !== new Set(tasks).size) return false;
                    if (c.minion.output == 0) return false;
                    // Otherwise, accept it
                    return true;
                })

                if (!filteredPaths || filteredPaths.length === 0) {
                    return {rating: Infinity, output: null};
                }
                let bestPlan = filteredPaths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                let weight = (taskRequest.task && creep.memory.favoredTasks?.includes(taskRequest.task?.action.constructor.name)) ? 2 : 1;
                return {
                    rating: weight * (bestPlan.minion.output/bestPlan.cost), // rating = output/tick, with a bonus if the minion likes the work
                    output: bestPlan
                }
            });
        priorities.forEach(([creep, taskRequest, taskPlan]) => {
            if (!taskPlan) return;
            // console.log(`[TaskManager] Task plan accepted for ${taskPlan.minion.creep} with cost ${taskPlan.cost}:\n` +
            //             `Outcome: [${taskPlan.minion.capacityUsed}/${taskPlan.minion.capacity}] => ${taskPlan.minion.output} at (${JSON.stringify(taskPlan.minion.pos)}) \n` +
            //             `${taskPlan.tasks.map(t => t.constructor.name)}`)
            let task = new Task(taskPlan.tasks, creep, taskRequest.sourceId, taskPlan.cost, taskPlan.minion.output);
            this.assign(task);
        })
    }
    isIdle = (creep: Creep) => {
        return !this.tasks.some(t => t.creep?.id === creep.id);
    }
    getAvailableCreeps = (room: Room) => {
        return Object.values(room.find(FIND_MY_CREEPS)).filter(c => !c.memory.ignoresRequests && this.isIdle(c))
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
    getAssociatedTasks(request: TaskRequest) {
        return this.tasks.filter(task => (
            task.actions[task.actions.length -1].constructor.name === request.task?.constructor.name &&
            task.sourceId === request.sourceId
        ))
    }
    report() {
        const taskTable = [['Source', 'Goal', 'Current Step', 'Minion', 'Predicted Cost']];
        taskTable.push(
            ...this.tasks.map(t => ([
                Game.getObjectById(t.sourceId as Id<any>)?.toString() || '',
                t.actions[t.actions.length - 1].constructor.name || '',
                t.actions[0].constructor.name || '',
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
                    Game.getObjectById(r.sourceId as Id<any>)?.toString() || '',
                    r.task?.constructor.name || '',
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


        console.log(`[TaskManager] Status Report:
    <strong>Tasks</strong>
${taskTableRendered}
    <strong>Requests</strong>
${requestTableRendered}`
        )
    }
}
