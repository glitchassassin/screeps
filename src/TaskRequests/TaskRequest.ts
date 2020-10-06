import { Exclude, Transform, Type } from "class-transformer";
import { transformRoomPosition } from "utils/transformGameObject";
import { Task } from "./Task";
import { TaskAction } from "./TaskAction";
import { BuildTask } from "./types/BuildTask";
import { DepotTask } from "./types/DepotTask";
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
                { value: DepotTask, name: 'DepotTask' },
                { value: TaskAction, name: 'TaskAction' },
            ]
        }
    })
    task: TaskAction|null = null;

    @Transform(transformRoomPosition)
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
