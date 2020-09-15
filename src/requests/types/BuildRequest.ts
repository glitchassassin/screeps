import { TaskManager } from "managers/TaskManager";
import { BuildTask } from "tasks/types/BuildTask";
import { TransferTask } from "tasks/types/TransferTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { Request } from "../Request";

export class BuildRequest extends Request {
    constructor(
        public sourceId: string|null = null,
        public priority = 5,
        public target: ConstructionSite|null = null,
    ) { super(); }

    fulfill = (room: Room) => {
        this.assignedTo.forEach(creepId => {
            let creep = Game.getObjectById(creepId as Id<Creep>);
            if (creep?.store.getUsedCapacity() === 0) {
                // Minion is empty; unassign it
                this.assignedTo = this.assignedTo.filter(id => id !== creep?.id)
            } else if (!this.target) {
                // Target is complete; fulfill the request
                this.completed = true;
                return;
            }
            if (creep && global.managers.task.isIdle(creep)) {
                if (creep.store.getFreeCapacity() === 0) {
                    // Minion has a full tank - use it
                    global.managers.task.assign(new BuildTask(creep, this.target))
                }
                else if (creep.store.getUsedCapacity() > 0) {
                    // Minion is running low; is there somewhere to top up? If not, use what we have.
                    let source = global.analysts.logistics.getMostFullAllSources(room);
                    if (source && source.store[RESOURCE_ENERGY] > 0) {
                        global.managers.task.assign(new WithdrawTask(creep, source))
                    } else {
                        global.managers.task.assign(new BuildTask(creep, this.target))
                    }
                }
            }
        })
    }

    serialize = () => {
        return Request.prototype.serialize.call(this, {
            target: this.target?.id,
        })
    }
    deserialize = (task: any) => {
        Request.prototype.deserialize.call(this, task);
        this.target = Game.getObjectById(task.target as Id<ConstructionSite>)
        return this;
    }

    canAssign = () => {
        if (!this.target) return false;
        if (this.assignedTo.length === 0) return true;

        let amount = this.target.progressTotal - this.target.progress;

        let capacity = this.assignedTo
            .map(id => Game.getObjectById(id as Id<Creep>)?.store[RESOURCE_ENERGY])
            .filter((e): e is number => !!(e && e > 0)).reduce((a, b) => a + b, 0);
        // We need more than these minions can carry, so we can assign another
        return capacity < amount;
    }
}
