import { TaskManager } from "managers/TaskManager";
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
        let creep = Game.getObjectById(this.assignedTo as Id<Creep>);
        if (creep?.store.getUsedCapacity() === 0 || (this.target as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            // Minion is empty or target is full; fulfill the request
            this.completed = true;
            return;
        }
        if (creep && global.managers.task.isIdle(creep)) {
            if (creep.store.getFreeCapacity() === 0) {
                // Minion has a full tank - deposit it
                global.managers.task.assign(new TransferTask(creep, this.target))
            }
            else if (creep.store.getUsedCapacity() > 0) {
                // Minion is running low; is there somewhere to top up? If not, deposit what we have.
                let source = global.analysts.logistics.getMostFullAllSources(room);
                if (source && source.id !== this.target?.id && source.store[RESOURCE_ENERGY] > 0) {
                    global.managers.task.assign(new WithdrawTask(creep, source))
                } else {
                    global.managers.task.assign(new TransferTask(creep, this.target))
                }
            }
        }
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
}
