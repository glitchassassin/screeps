import * as ct from "class-transformer";
import { Request } from "requests/Request";
import { Task } from "tasks/Task";
import { TaskRequest } from "tasks/TaskRequest";
import { resolveTaskTrees } from "tasks/TaskTree";
import { taskTypes } from "tasks/TaskTypes";
import { Manager } from "./Manager";

type RequestsMap<T> = {
    [id: string]: {
        [id: string]: T
    }
}

export class TaskManager extends Manager {
    tasks: Task[] = [];
    requests: RequestsMap<TaskRequest> = {};

    submit = (request: TaskRequest) => {
        if (!request.sourceId || !request.task) return;
        if (this.requests[request.task.constructor.name] === undefined) {
            this.requests[request.task.constructor.name] = {};
        }
        if (!this.requests[request.task.constructor.name][request.sourceId]) {
            this.requests[request.task.constructor.name][request.sourceId] = request;
            console.log(`[TaskManager] Received priority ${request.priority} ${request.task.constructor.name} request from ${request.sourceId}`)
        }
    }
    assign = (task: Task) => {
        task.creep?.say(task.message);
        this.tasks.push(task);
    }
    load = (room: Room) => {
        // Load tasks from Memory
        if (Memory.rooms[room.name]?.tasks) {
            this.tasks = ct.deserializeArray(Task, Memory.rooms[room.name]?.tasks as string);
        } else {
            this.tasks = [];
        }
        // Load requests from Memory
        if (Memory.rooms[room.name]?.requests) {
            let deserialized = JSON.parse(Memory.rooms[room.name]?.requests as string)
            for (let reqType in deserialized) {
                this.requests[reqType] = {};
                for (let reqSource in deserialized[reqType]) {
                    try {
                        this.requests[reqType][reqSource] = ct.deserialize(TaskRequest, deserialized[reqType][reqSource])
                    } catch {
                        console.log(`[TaskManager] Failed to parse: ${deserialized[reqType][reqSource]}`);
                    }
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
                console.log(`[TaskManager] Pending ${request.task.constructor.name} request`);
                // Find the best candidate from the idle minions
                let candidate = this.idleCreeps(room).map(creep => {
                    let paths = resolveTaskTrees({
                        creep,
                        capacity: creep.store.getCapacity(),
                        capacityUsed: creep.store.getUsedCapacity(),
                        pos: creep.pos
                    }, request.task as Task)
                    if (!paths || paths.length === 0) return;
                    return paths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                }).reduce((a, b) => (!b || a && a.cost < b.cost) ? a : b, undefined)

                if (candidate) {
                    request.task.creep = candidate.minion.creep;
                    console.log(candidate.tasks)
                    this.assign(request.task);
                }
        })
        // Run assigned tasks
        this.tasks = this.tasks.filter(task => {
            if (task.action()) {
                if (task.next) {
                    task.next.creep = task.creep;
                    this.assign(task.next);
                }
                return true;
            }
            return false;
        })
    }
    cleanup = (room: Room) => {
        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = { }
        Memory.rooms[room.name].tasks = ct.serialize(this.tasks
            .filter(task => !task.completed || Game.time > task.created + 500))

        let serialized: RequestsMap<string> = {};

        for (let reqType in this.requests) {
            serialized[reqType] = {};
            for (let reqSource in this.requests[reqType]) {
                if (this.requests[reqType][reqSource].completed || Game.time > this.requests[reqType][reqSource].created + 500) {
                    // Completed or timed out
                    delete this.requests[reqType][reqSource]
                } else {
                    serialized[reqType][reqSource] = ct.serialize(this.requests[reqType][reqSource])
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
