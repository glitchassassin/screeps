import { TaskManager } from "managers/TaskManager";
import { HarvestTask } from "tasks/types/HarvestTask";
import { TransferTask } from "tasks/types/TransferTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { Request } from "../Request";

export enum MinionTypes {
    MINER
}

export class EnergyRequest extends Request {
    constructor(
        public sourceId: string|null = null,
        public priority = 5,
        public target: Structure|null = null,
        public amount: number|null = null,
    ) { super(); }

    fulfill = (room: Room) => {
        this.assignedTo.forEach(creepId => {
            let creep = Game.getObjectById(creepId as Id<Creep>);
            if ((this.target as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                // Target is full; fulfill the request
                this.completed = true;
                return;
            }
            if (creep && global.managers.task.isIdle(creep)) {
                if (creep.store.getFreeCapacity() === 0) {
                    // Minion has a full tank - deposit it
                    global.managers.task.assign(new TransferTask(creep, this.target))
                }
                else if (creep.store.getUsedCapacity() > 0) {
                    // Minion is running low; is there somewhere to top up? If not, find a source to harvest
                    let source = global.analysts.logistics.getMostFullAllSources(room);
                    if (source && source.id !== this.target?.id && source.store[RESOURCE_ENERGY] > 0) {
                        global.managers.task.assign(new WithdrawTask(creep, source))
                    } else {
                        let mine = global.analysts.source.getDesignatedMiningLocations(room).find(m => m.source?.energy);
                        if (mine) {
                            global.managers.task.assign(new HarvestTask(creep, mine.source))
                        } else {
                            // No collection sources, no harvest sources, abandon request
                            this.assignedTo = this.assignedTo.filter(id => id !== creep?.id)
                        }
                    }
                }
            }
        })
    }

    serialize = () => {
        return Request.prototype.serialize.call(this, {
            target: this.target?.id,
            amount: this.amount
        })
    }
    deserialize = (task: any) => {
        Request.prototype.deserialize.call(this, task);
        this.target = Game.getObjectById(task.target as Id<Structure>)
        this.amount = task.amount;
        return this;
    }

    canAssign = () => {
        if (!this.amount) return (this.assignedTo.length === 0);
        if (this.assignedTo.length === 0) return true;
        let capacity = this.assignedTo
            .map(id => Game.getObjectById(id as Id<Creep>)?.store[RESOURCE_ENERGY])
            .filter((e): e is number => !!(e && e > 0)).reduce((a, b) => a + b, 0);
        // We need more than these minions can carry, so we can assign another
        return capacity < this.amount;
    }
}
