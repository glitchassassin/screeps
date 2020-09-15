import { Task } from "../Task";

export class UpgradeTask extends Task {
    message = "⏫";
    constructor(
        public creep: Creep|null = null,
        public destination: StructureController|null = null,
    ) { super() }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.destination) return true;

        let result = this.creep.upgradeController(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.destination);
        } else if (result === ERR_NOT_ENOUGH_ENERGY) {
            return true;
        }
        return false;
    }

    serialize = () => {
        return JSON.stringify({
            taskType: this.constructor.name,
            creepId: this.creep?.id,
            destinationId: this.destination?.id
        })
    }
    deserialize = (task: any) => {
        this.creep = Game.getObjectById(task.creepId as Id<Creep>)
        this.destination = Game.getObjectById(task.destinationId as Id<StructureController>)
        return this;
    }
}
