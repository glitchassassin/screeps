import { TaskAction } from './TaskAction';

export class Task {
    completed = false;
    created = Game.time;
    sourceId: string|null;
    cost: number;
    output: number;
    creepId: Id<Creep>;

    public get creep() : Creep|null {
        return Game.getObjectById(this.creepId)
    }

    actions: TaskAction[] = [];

    constructor(actions: TaskAction[], creep: Creep, sourceId: string|null = null, cost: number = 0, output: number = 0) {
        this.actions = actions;
        this.creepId = creep?.id;
        this.sourceId = sourceId;
        this.cost = cost;
        this.output = output;
    }

}
