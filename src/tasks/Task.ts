import { Transform, Type } from 'class-transformer';
import { TransformationType } from 'class-transformer/enums';
import { taskTypes } from '../internal';
import { BuildTask, HarvestTask, TransferTask, TravelTask, UpgradeTask, WithdrawTask } from './types';

export type SpeculativeMinion = {
    capacity: number,
    capacityUsed: number,
    pos: RoomPosition,
    creep: Creep
}

export class TaskPrerequisite {
    constructor(
        public met: (minion: SpeculativeMinion) => boolean,
        public toMeet: (minion: SpeculativeMinion) => Task[]|null
    ) {}
}

export class Task {
    @Type(() => TaskPrerequisite)
    prereqs: TaskPrerequisite[] = [];
    @Type(() => Task, {
        discriminator: {
            property: '__type',
            subTypes: [
                { value: BuildTask, name: 'BuildTask' },
                { value: HarvestTask, name: 'HarvestTask' },
                { value: TransferTask, name: 'TransferTask' },
                { value: TravelTask, name: 'TravelTask' },
                { value: UpgradeTask, name: 'UpgradeTask' },
                { value: WithdrawTask, name: 'WithdrawTask' },
            ],
        },
    })
    next: Task|null = null;
    @Type(() => Creep)
    @Transform((value, obj, type) => {
        switch(type) {
            case TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<Creep>);
            case TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case TransformationType.CLASS_TO_CLASS:
                return obj;
        }
    })
    creep: Creep|null = null;
    completed = false;
    message = "☑";
    created = Game.time;
    constructor(creep: Creep|null = null) {
        this.creep = creep;
    }

    action = () => true;
    cost = (minion: SpeculativeMinion) => 0;
}
