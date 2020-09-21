import { classToClass, classToPlain, plainToClass, Transform, TransformationType, Type } from 'class-transformer';
import { transformGameObject } from 'utils/transformGameObject';
import { SpeculativeMinion } from './SpeculativeMinion';
import { TaskAction } from './TaskAction';
import { TaskPrerequisite } from './TaskPrerequisite';
import { BuildTask } from './types/BuildTask';
import { HarvestTask } from './types/HarvestTask';
import { RepairTask } from './types/RepairTask';
import { TransferTask } from './types/TransferTask';
import { TravelTask } from './types/TravelTask';
import { UpgradeTask } from './types/UpgradeTask';
import { WithdrawTask } from './types/WithdrawTask';

export class Task {
    @Type(() => Creep)
    @Transform(transformGameObject(Creep))
    creep: Creep|null;

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
                { value: TaskAction, name: 'TaskAction' },
            ]
        }
    })
    actions: TaskAction[] = [];

    completed = false;
    created = Game.time;
    sourceId: string|null;

    constructor(actions: TaskAction[], creep: Creep, sourceId: string|null = null) {
        this.actions = actions;
        this.creep = creep;
        this.sourceId = sourceId
    }

}
