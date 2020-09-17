import * as ct from "class-transformer";
import { Task } from "./Task";
import { taskTypes } from "./TaskTypes";

export class TaskRequest {
    completed = false;
    created = Game.time;
    sourceId: string|null = null;
    priority = 5;

    @ct.Type(() => Task)
    task: Task|null = null;

    constructor(
        sourceId: string|null = null,
        task: Task|null = null,
        priority = 5,
    ) {
        this.sourceId = sourceId;
        this.task = task;
        this.priority = priority;
    }
}
