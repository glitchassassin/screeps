import { Task } from "./Task";
import { taskTypes } from "./TaskTypes";

export class TaskRequest {
    completed = false;
    created = Game.time;
    constructor(
        public sourceId: string|null = null,
        public task: Task|null = null,
        public priority = 5,
    ) { }

    public deserialize(request: any) {
        this.sourceId = request.sourceId;
        this.completed = request.completed;
        this.task = new taskTypes[request.task.taskType]().deserialize(request.task);
        this.priority = request.priority;
        return this;
    }

    public serialize (subProps?: {[id: string]: any}) {
        return JSON.stringify({
            taskType: this.constructor.name,
            sourceId: this.sourceId,
            task: this.task?.serialize(),
            completed: this.completed,
            priority: this.priority,
            ...subProps
        })
    }
}
