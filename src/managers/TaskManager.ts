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
            console.log(`[RequestManager] Received priority ${request.priority} ${request.task.constructor.name} request from ${request.sourceId}`)
        }
    }
    assign = (task: Task) => {
        task.creep?.say(task.message);
        this.tasks.push(task);
    }
    load = (room: Room) => {
        // Load tasks from Memory
        if (Memory.rooms[room.name]?.tasks) {
            this.tasks = Memory.rooms[room.name]?.tasks?.split('|').map(task => {
                let deserialized = JSON.parse(task);
                return new taskTypes[deserialized.taskType]().deserialize(deserialized);
            }) || [];
        } else {
            this.tasks = [];
        }
        // Load requests from Memory
        if (Memory.rooms[room.name]?.requests) {
            let deserialized = JSON.parse(Memory.rooms[room.name]?.requests as string)
            for (let reqType in deserialized) {
                this.requests[reqType] = {};
                for (let reqSource in deserialized[reqType]) {
                    this.requests[reqType][reqSource] = new TaskRequest().deserialize(JSON.parse(deserialized[reqType][reqSource]))
                }
            }
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
                let candidate = this.idleCreeps(room).map(creep => {
                    return resolveTaskTrees({
                        creep,
                        capacity: creep.store.getCapacity(),
                        capacityUsed: creep.store.getUsedCapacity(),
                        pos: creep.pos
                    }, request.task as Task)?.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                }).reduce((a, b) => (!b || a && a.cost < b.cost) ? a : b)

                if (candidate) {
                    request.task.creep = candidate.minion.creep;
                    this.assign(request.task);
                }
        })
        // Run assigned tasks
        this.tasks = this.tasks.filter(task => !task.action())
    }
    cleanup = (room: Room) => {
        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = { }
        Memory.rooms[room.name].tasks = this.tasks
            .filter(task => !task.completed || Game.time > task.created + 500)
            .map(t => t.serialize()).join('|');

        let serialized: RequestsMap<string> = {};

        for (let reqType in this.requests) {
            serialized[reqType] = {};
            for (let reqSource in this.requests[reqType]) {
                if (this.requests[reqType][reqSource].completed || Game.time > this.requests[reqType][reqSource].created + 500) {
                    // Completed or timed out
                    delete this.requests[reqType][reqSource]
                } else {
                    serialized[reqType][reqSource] = this.requests[reqType][reqSource].serialize()
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
