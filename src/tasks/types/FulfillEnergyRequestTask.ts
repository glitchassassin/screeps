import { Task } from "../Task";

export class FulfillEnergyRequestTask extends Task {
    constructor(
        public creep: Creep|null = null,
        public target: Structure|null = null,
    ) { super(); }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.target) return true;

        if (this.creep.transfer(this.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.target);
            return false;
        }
        return true;
    }

    serialize = () => {
        return JSON.stringify({
            taskType: this.constructor.name,
            creepId: this.creep?.id,
            targetId: this.target?.id
        })
    }
    deserialize = (task: any) => {
        this.creep = Game.getObjectById(task.creepId as Id<Creep>)
        this.target = Game.getObjectById(task.targetId as Id<Structure>)
        return this;
    }
}
