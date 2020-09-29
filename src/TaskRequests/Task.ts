import { classToClass, classToPlain, Exclude, plainToClass, Transform, TransformationType, Type } from 'class-transformer';
import { transformGameObject } from 'utils/transformGameObject';
import { SpeculativeMinion } from './SpeculativeMinion';
import { TaskAction } from './TaskAction';
import { TaskPrerequisite } from './TaskPrerequisite';
import { BuildTask } from './types/BuildTask';
import { HarvestTask } from './types/HarvestTask';
import { RepairTask } from './types/RepairTask';
import { ResupplyTask } from './types/ResupplyTask';
import { TransferTask } from './types/TransferTask';
import { TravelTask } from './types/TravelTask';
import { UpgradeTask } from './types/UpgradeTask';
import { WithdrawTask } from './types/WithdrawTask';

export class Task {
    completed = false;
    created = Game.time;
    sourceId: string|null;
    cost: number;
    output: number;
    creepId: Id<Creep>;

    @Exclude()
    public get creep() : Creep|null {
        return Game.getObjectById(this.creepId)
    }

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
                { value: TaskAction, name: 'TaskAction' },
            ]
        }
    })
    actions: TaskAction[] = [];

    constructor(actions: TaskAction[], creep: Creep, sourceId: string|null = null, cost: number = 0, output: number = 0) {
        this.actions = actions;
        this.creepId = creep?.id;
        this.sourceId = sourceId;
        this.cost = cost;
        this.output = output;
    }

}
