import { classToClass, classToPlain, plainToClass, Transform, TransformationType, Type } from 'class-transformer';
import { transformGameObject } from 'utils/transformGameObject';
import { SpeculativeMinion } from './SpeculativeMinion';
import { TaskAction } from './TaskAction';
import { TaskPrerequisite } from './TaskPrerequisite';
import { BuildTask } from './types/BuildTask';
import { HarvestTask } from './types/HarvestTask';
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
            ]
        }
    })
    actions: TaskAction[] = [];

    completed = false;
    created = Game.time;

    constructor(actions: TaskAction[], creep: Creep) {
        this.actions = actions;
        this.creep = creep;
    }

}
