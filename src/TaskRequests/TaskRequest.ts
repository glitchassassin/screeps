import { Task } from "./Task";
import { TaskAction } from "./TaskAction";

export class TaskRequest {
    completed = false;
    created = Game.time;

    assignedTasks: Task[] = [];

    task: TaskAction|null = null;

    depot: RoomPosition|null

    constructor(
        public sourceId: string|null = null,
        task: TaskAction|null = null,
        public priority = 5,
        public capacity = 0,
        depot: RoomPosition|null = null
    ) {
        this.task = task;
        this.depot = depot;
    }
}
