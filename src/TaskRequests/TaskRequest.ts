import { Exclude, Type } from "class-transformer";
import { Task } from "./Task";
import { TaskAction } from "./TaskAction";
import { BuildTask } from "./types/BuildTask";
import { DropTask } from "./types/DropTask";
import { ExploreTask } from "./types/ExploreTask";
import { HarvestTask } from "./types/HarvestTask";
import { RepairTask } from "./types/RepairTask";
import { ResupplyTask } from "./types/ResupplyTask";
import { TransferTask } from "./types/TransferTask";
import { TravelTask } from "./types/TravelTask";
import { UpgradeTask } from "./types/UpgradeTask";
import { WithdrawTask } from "./types/WithdrawTask";

export class TaskRequest {
    completed = false;
    created = Game.time;
    sourceId: string|null = null;
    priority: number;
    capacity: number;

    assignedTasks: Task[] = [];

    @Type(() => TaskAction, {
        discriminator: {
            property: '__type',
            subTypes: [
                { value: BuildTask, name: 'BuildTask' },
                { value: HarvestTask, name: 'HarvestTask' },
                { value: TransferTask, name: 'TransferTask' },
                { value: TravelTask, name: 'TravelTask' },
                { value: UpgradeTask, name: 'UpgradeTask' },
                { value: WithdrawTask, name: 'WithdrawTask' },
                { value: RepairTask, name: 'RepairTask' },
                { value: ResupplyTask, name: 'ResupplyTask' },
                { value: ExploreTask, name: 'ExploreTask' },
                { value: DropTask, name: 'DropTask' },
                { value: TaskAction, name: 'TaskAction' },
            ]
        }
    })
    task: TaskAction|null = null;

    constructor(
        sourceId: string|null = null,
        task: TaskAction|null = null,
        priority = 5,
        capacity = 0
    ) {
        this.sourceId = sourceId;
        this.task = task;
        this.priority = priority;
        this.capacity = capacity;
    }
}
