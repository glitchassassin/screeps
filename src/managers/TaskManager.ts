import { deserialize, deserializeArray, serialize } from "class-transformer";
import { Task } from "tasks/Task";
import { TaskAction } from "tasks/TaskAction";
import { TaskRequest } from "tasks/TaskRequest";
import { resolveTaskTrees, TaskPlan } from "tasks/resolveTaskTrees";
import { Manager } from "./Manager";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { TransferTask } from "tasks/types/TransferTask";

type RequestsMap<T> = {
    [id: string]: {
        [id: string]: T
    }
}

const DEBUG_MINION = null;

export class TaskManager extends Manager {
    tasks: Task[] = [];
    requests: RequestsMap<TaskRequest> = {};

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
            console.log(`[TaskManager] Received priority ${request.priority} ${request.task.constructor.name} request from ${request.sourceId}`)
        }
    }
    assign = (task: Task) => {
        task.creep?.say(task.actions[0].message);
        this.tasks.push(task);
    }
    load = (room: Room) => {
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
        // Assign requests
        Object.values(this.requests)
            .map(taskType => Object.values(taskType))
            .reduce((a, b) => a.concat(b), [])
            .sort((a, b) => b.priority - a.priority) // Higher priority sorts to the top
            .forEach(request => {
                if (!request.task) {
                    request.completed = true;
                    return;
                }
                // Find the best candidate from the idle minions
                let candidates = (this.idleCreeps(room).map(creep => {
                    let paths = resolveTaskTrees({
                        output: 0,
                        creep,
                        capacity: creep.store.getCapacity(),
                        capacityUsed: creep.store.getUsedCapacity(),
                        pos: creep.pos
                    }, request.task as TaskAction)
                    if (!paths || paths.length === 0) return;
                    return paths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                }).filter(c => {
                    // If task plan is null, filter it
                    if (!c) return false;
                    // If task plan has withdraw and transfer loop, filter it
                    let tasks = (c.tasks.filter(t => t instanceof WithdrawTask || t instanceof TransferTask) as (WithdrawTask|TransferTask)[])
                        .map(t => t.destination?.id)
                    if (tasks.length !== new Set(tasks).size) return false;
                    // Otherwise, accept it
                    return true;
                }) as TaskPlan[])
                .sort((a, b) => (a.cost - b.cost))
                // candidates.forEach(c => {
                //     if (c)
                //         console.log(`[TaskManager] Potential task plan for ${c.minion.creep} with cost ${c.cost}:\n` +
                //                     `Outcome: [${c.minion.capacityUsed}/${c.minion.capacity}] => ${c.minion.output} at (${JSON.stringify(c.minion.pos)}) \n` +
                //                     `${c.tasks.map(t => t.constructor.name)}`)
                // })

                let candidate = candidates[0];

                if (candidate) {
                    // console.log(`[TaskManager] Task plan accepted for ${candidate.minion.creep} with cost ${candidate.cost}:\n${candidate.tasks.map(t => t.constructor.name)}`)
                    if (candidate.minion.creep.name === DEBUG_MINION) {
                        console.log(`[${DEBUG_MINION}] is idle? ${this.isIdle(candidate.minion.creep)}`)
                        console.log(`[${DEBUG_MINION}] delegated new request ${request.task.constructor.name}`)
                        console.log(`[TaskManager] Task plan accepted for ${DEBUG_MINION} with cost ${candidate.cost}:\n${candidate.tasks.map(t => t.constructor.name)}`)
                    }
                    let task = new Task(candidate.tasks, candidate.minion.creep);
                    this.assign(task);
                }
        })
        // Run assigned tasks
        this.tasks = this.tasks.filter(task => {
            if (!task.creep) return false; // Creep disappeared, cancel task
            let result = task.actions[0].action(task.creep)
            if (task.creep.name === DEBUG_MINION) {
                console.log(`[${DEBUG_MINION}] ${task.actions[0].constructor.name} - ${result}`)
            }
            if (result) {
                // console.log(`[${task.action.constructor.name}] completed`)
                task.actions.shift();
                if (task.actions.length > 0) {
                    task.creep?.say(task.actions[0].message);
                    if (task.creep.name === DEBUG_MINION) {
                        console.log(`[${DEBUG_MINION}] Task completed, starting on ${task.actions[0].constructor.name}`)
                    }
                } else {
                    task.completed = true;
                    return true;
                }
                return false;
            }
            return true;
        })
    }
    cleanup = (room: Room) => {
        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = { }
        Memory.rooms[room.name].tasks = serialize(this.tasks
            .filter(task => !task.completed || Game.time > task.created + 500))

        let serialized: RequestsMap<string> = {};

        for (let reqType in this.requests) {
            serialized[reqType] = {};
            for (let reqSource in this.requests[reqType]) {
                if (this.requests[reqType][reqSource].completed || Game.time > this.requests[reqType][reqSource].created + 500) {
                    // Completed or timed out
                    delete this.requests[reqType][reqSource]
                } else {
                    serialized[reqType][reqSource] = serialize(this.requests[reqType][reqSource])
                }
            }
        }

        Memory.rooms[room.name].requests = JSON.stringify(serialized);
    }

    isIdle = (creep: Creep) => {
        return !this.tasks.some(t => t.creep?.id === creep.id);
    }
    idleCreeps = (room: Room) => {
        return Object.values(room.find(FIND_MY_CREEPS)).filter(c => this.isIdle(c))
    }
}
