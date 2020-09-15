export class Task {
    completed = false;
    constructor(
        public creep: Creep|null = null
    ) { }

    action = () => true;

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
