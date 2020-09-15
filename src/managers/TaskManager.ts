import { Request } from "requests/Request";
import { Task } from "tasks/Task";
import { taskTypes } from "tasks/TaskTypes";
import { Manager } from "./Manager";

export class TaskManager extends Manager {
    tasks: Task[] = [];
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
    }
    run = (room: Room) => {
        this.tasks = this.tasks.filter(task => !task.action())
    }
    cleanup = (room: Room) => {
        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = { }
        Memory.rooms[room.name].tasks = this.tasks
            .filter(task => !task.completed)
            .map(t => t.serialize()).join('|');
    }

    isIdle = (creep: Creep) => {
        return !this.tasks.some(t => t.creep?.id === creep.id);
    }
}
