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
    prereqs: TaskPrerequisite[] = [];
    completed = false;
    message = "☑";
    created = Game.time;
    constructor(
        public creep: Creep|null = null
    ) { }

    action = () => true;
    cost = (minion: SpeculativeMinion) => 0;

    deserialize = (task: any) => {
        this.creep = Game.getObjectById(task.creepId as Id<Creep>);
        return this;
    }

    serialize = () => {
        return JSON.stringify({
            taskType: this.constructor.name,
            creepId: this.creep?.id
        })
    }
}
