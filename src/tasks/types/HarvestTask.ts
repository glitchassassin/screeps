import { Task } from "../Task";

export class HarvestTask extends Task {
    message = "⚡";
    constructor(
        public creep: Creep|null = null,
        public source: Source|null = null,
    ) { super(); }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.source) return true;

        this.creep.harvest(this.source);
        if (this.creep.store.getCapacity()) {
            // If can carry, is the creep full?
            return this.creep.store.getFreeCapacity() == 0;
        } else {
            // If cannot carry, is the local container full?
            let container = this.creep.pos.lookFor(LOOK_STRUCTURES)
                .find(s => s.structureType === STRUCTURE_CONTAINER)
            // If the container is full or missing, we cannot store,
            // so there is no point in harvesting
            if (!container || (container as StructureContainer).store.getFreeCapacity()) return true;
        }
        return false;
    }

    serialize = () => {
        return JSON.stringify({
            taskType: this.constructor.name,
            creepId: this.creep?.id,
            sourceId: this.source?.id
        })
    }
    deserialize = (task: any) => {
        this.creep = Game.getObjectById(task.creepId as Id<Creep>)
        this.source = Game.getObjectById(task.sourceId as Id<Source>)
        return this;
    }
}
