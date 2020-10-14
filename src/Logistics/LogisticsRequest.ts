import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import profiler from "screeps-profiler";
import { getFreeCapacity } from "utils/gameObjectSelectors";

export class LogisticsRequest {
    public assignedCapacity = 0;
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
            this.capacity = getFreeCapacity(target);
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
    private logisticsAnalyst: LogisticsAnalyst;

    constructor(
        public pos: RoomPosition,
        public priority: number,
        public capacity: number = -1,
    ) {
        super(pos, priority, capacity);
        this.logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
    }

    action(creep: Creep) {
        // Wait for minions to request resources
        if (!creep.pos.isNearTo(this.pos)) {
            return travel(creep, this.pos)
        }
        if (creep.store.getUsedCapacity() === 0) {
            this.completed = true;
            return OK;
        }
        this.logisticsAnalyst.reportDepot(creep);
        return OK;
    }
}

profiler.registerClass(DepotRequest, 'DepotRequest');
profiler.registerClass(TransferRequest, 'TransferRequest');
