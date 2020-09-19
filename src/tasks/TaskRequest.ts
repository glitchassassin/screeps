import { Exclude, Type } from "class-transformer";
import { TaskAction } from "./TaskAction";
import { BuildTask } from "./types/BuildTask";
import { HarvestTask } from "./types/HarvestTask";
import { TransferTask } from "./types/TransferTask";
import { TravelTask } from "./types/TravelTask";
import { UpgradeTask } from "./types/UpgradeTask";
import { WithdrawTask } from "./types/WithdrawTask";

export class TaskRequest {
    completed = false;
    created = Game.time;
    sourceId: string|null = null;
    priority = 5;

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
                { value: TaskAction, name: 'TaskAction' },
            ]
        }
    })
    task: TaskAction|null = null;

    constructor(
        sourceId: string|null = null,
        task: TaskAction|null = null,
        priority = 5,
    ) {
        this.sourceId = sourceId;
        this.task = task;
        this.priority = priority;
    }
}
