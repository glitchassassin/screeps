import { deserialize, deserializeArray, serialize } from "class-transformer";
import { Task } from "tasks/Task";
import { TaskAction } from "tasks/TaskAction";
import { TaskRequest } from "tasks/TaskRequest";
import { resolveTaskTrees } from "tasks/resolveTaskTrees";
import { Manager } from "./Manager";

type RequestsMap<T> = {
    [id: string]: {
        [id: string]: T
    }
}

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
        task.creep?.say(task.action.message);
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
                let candidates = this.idleCreeps(room).map(creep => {
                    let paths = resolveTaskTrees({
                        creep,
                        capacity: creep.store.getCapacity(),
                        capacityUsed: creep.store.getUsedCapacity(),
                        pos: creep.pos
                    }, request.task as TaskAction)
                    if (!paths || paths.length === 0) return;
                    return paths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                })
                // candidates.forEach(c => {
                //     if (c)
                //         console.log(`[TaskManager] Potential task plan for ${c.minion.creep} with cost ${c.cost}:\n${c.tasks.map(t => t.constructor.name)}`)
                // })
                let candidate = candidates.reduce((a, b) => (!b || a && a.cost < b.cost) ? a : b, undefined)

                if (candidate) {
                    // console.log(`[TaskManager] Task plan accepted for ${candidate.minion.creep} with cost ${candidate.cost}:\n${candidate.tasks.map(t => t.constructor.name)}`)
                    let task = new Task(request.task, candidate.minion.creep);
                    // Create task chain
                    let currentTask = task;
                    for (let i = 0; i < candidate.tasks.length; i++) {
                        currentTask.next = new Task(candidate.tasks[i], candidate.minion.creep)
                        currentTask = currentTask.next;
                    }
                    this.assign(task);
                }
        })
        // Run assigned tasks
        this.tasks = this.tasks.filter(task => {
            if (!task.creep) return true; // Creep disappeared, cancel task
            let result = task.action.action(task.creep)
            if (result) {
                task.completed = true;
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
