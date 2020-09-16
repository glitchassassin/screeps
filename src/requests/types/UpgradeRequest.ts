import { TransferTask } from "tasks/types/TransferTask";
import { UpgradeTask } from "tasks/types/UpgradeTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { Request } from "../Request";

export class UpgradeRequest extends Request {
    constructor(
        public sourceId: string|null = null,
        public priority = 4,
        public target: StructureController|null = null,
    ) { super(); }

    fulfill = (room: Room) => {
        this.assignedTo.forEach(creepId => {
            let creep = Game.getObjectById(creepId as Id<Creep>);
            if (creep?.store.getUsedCapacity() === 0) {
                // Minion is empty; fulfill the request
                this.completed = true;
                return;
            }
            if (creep && global.managers.task.isIdle(creep)) {
                if (creep.store.getFreeCapacity() === 0) {
                    // Minion has a full tank - deposit it
                    global.managers.task.assign(new UpgradeTask(creep, this.target))
                }
                else if (creep.store.getUsedCapacity() > 0) {
                    // Minion is running low; is there somewhere to top up? If not, deposit what we have.
                    let source = global.analysts.logistics.getMostFullAllSources(room);
                    if (source && source.store[RESOURCE_ENERGY] > 0) {
                        global.managers.task.assign(new WithdrawTask(creep, source))
                    } else {
                        global.managers.task.assign(new TransferTask(creep, this.target))
                    }
                }
            }
        });
    }

    serialize = () => {
        return Request.prototype.serialize.call(this, {
            target: this.target?.id,
        })
    }
    deserialize = (task: any) => {
        Request.prototype.deserialize.call(this, task);
        this.target = Game.getObjectById(task.target as Id<StructureController>);
        return this;
    }

    canAssign = () => {
        if (this.target && this.target.level < 8) {
            // Only limited by space
            let spaces = global.analysts.map.calculateNearbyPositions(this.target.pos, 3)
                .filter(global.analysts.map.isPositionWalkable).length
            return (this.assignedTo.length < spaces);
        } else {
            // At RCL 8, cap is 15 energy per tick
            let capacity = this.assignedTo.map(id => {
                let creep = Game.getObjectById(id as Id<Creep>);
                if (creep) return creep.body.filter(p => p.type === WORK).length;
                return 0;
            }).reduce((a, b) => a + b)
            return capacity < 15;
        }
    }
}
