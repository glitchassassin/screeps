import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import { getCapacity } from "utils/gameObjectSelectors";

export class LogisticsRequest {
    public completed = false;
    public assigned = false;
    public resupply = false;

    constructor(
        public pos: RoomPosition,
        public priority: number,
        public capacity: number = -1,
    ) { }

    action(creep: Creep): ScreepsReturnCode { return OK; }
}

export class TransferRequest extends LogisticsRequest {
    constructor(
        public target: AnyStoreStructure,
        public priority: number,
        public capacity: number = -1,
    ) {
        super(target.pos, priority, capacity);
        if (this.capacity === -1) {
            this.capacity = getCapacity(target);
        }
    }

    action(creep: Creep) {
        let result = creep.transfer(this.target, RESOURCE_ENERGY);
        if (result === OK) {
            this.completed = true;
        } else if (result === ERR_NOT_IN_RANGE) {
            return travel(creep, this.pos)
        }
        return result;
    }
}


export class ResupplyRequest extends TransferRequest {
    public resupply = true;
}

export class DepotRequest extends LogisticsRequest {
    action(creep: Creep) {
        // Wait for minions to request resources
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        if (!creep.pos.isNearTo(this.pos)) {
            return travel(creep, this.pos)
        }
        if (creep.store.getUsedCapacity() === 0) {
            this.completed = true;
            return OK;
        }
        logisticsAnalyst.reportDepot(creep);
        return OK;
    }
}
