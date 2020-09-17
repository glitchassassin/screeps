import * as ct from 'class-transformer';
// import { BuildTask } from './types/BuildTask';
// import { HarvestTask } from './types/HarvestTask';
// import { TransferTask } from './types/TransferTask';
// import { TravelTask } from './types/TravelTask';
// import { UpgradeTask } from './types/UpgradeTask';
// import { WithdrawTask } from './types/WithdrawTask';

export type SpeculativeMinion = {
    capacity: number,
    capacityUsed: number,
    pos: RoomPosition,
    creep: Creep
}

export class TaskPrerequisite {
    met = (minion: SpeculativeMinion) => false
    toMeet = (minion: SpeculativeMinion): Task[]|null => null
}

export class Task {
    @ct.Type(() => TaskPrerequisite)
    getPrereqs = (): TaskPrerequisite[] => ([]);
    // @ct.Type(() => Task, {
    //     discriminator: {
    //         property: '__type',
    //         subTypes: [
    //             { value: BuildTask, name: 'BuildTask' },
    //             { value: HarvestTask, name: 'HarvestTask' },
    //             { value: TransferTask, name: 'TransferTask' },
    //             { value: TravelTask, name: 'TravelTask' },
    //             { value: UpgradeTask, name: 'UpgradeTask' },
    //             { value: WithdrawTask, name: 'WithdrawTask' },
    //         ],
    //     },
    // })
    next: Task|null = null;
    @ct.Type(() => Creep)
    @ct.Transform((value, obj, type) => {
        switch(type) {
            case ct.TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<Creep>);
            case ct.TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case ct.TransformationType.CLASS_TO_CLASS:
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
