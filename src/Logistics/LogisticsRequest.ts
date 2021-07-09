import { BehaviorResult } from "BehaviorTree/Behavior";
import { BuildRequest } from "BehaviorTree/requests/Build";
import { CachedStructure } from "WorldState/Structures";
import { Capacity } from "WorldState/Capacity";
import { RepairRequest } from "BehaviorTree/requests/Repair";
import { SourceType } from "./LogisticsSource";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { byId } from "utils/gameObjectSelectors";
import { travel } from "Logistics/Travel";

export class LogisticsRequest {
    public assignedCapacity = 0;
    public completed = false;
    public assigned = false;

    toString() {
        return `[${this.constructor.name} ${this.pos.roomName}{${this.pos.x}, ${this.pos.y}} ${this.sourceType} ${this.completed ? 'completed' : 'pending'}]`;
    }

    constructor(
        public pos: RoomPosition,
        public priority: number,
        public capacity: number = -1,
        public sourceType = SourceType.STORAGE
    ) {
        if (this.capacity === 0) {
            this.completed = true;
        }
    }

    action(creep: Creep): ScreepsReturnCode { return OK; }
}

export class TransferRequest extends LogisticsRequest {
    public targetId: Id<AnyStoreStructure>
    constructor(
        target: CachedStructure<AnyStoreStructure>,
        public priority: number,
        public capacity: number = -1,
        public sourceType = SourceType.STORAGE
    ) {
        super(target.pos, priority, capacity, sourceType);
        this.targetId = target.id;
        if (this.capacity === -1) {
            this.capacity = Capacity.byId(this.targetId)?.free ?? 0
        }
        if (this.capacity === 0) {
            this.completed = true;
        }
    }

    action(creep: Creep) {
        let target = byId(this.targetId)
        if (!target) return ERR_NOT_FOUND;
        let result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) {
            this.completed = true;
        } else if (result === ERR_NOT_IN_RANGE) {
            return travel(creep, this.pos)
        }
        if (this.completed && this.sourceType === SourceType.PRIMARY) {
            const statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
            statisticsAnalyst.reportMetric(
                global.boardroom.getClosestOffice(this.pos)?.name ?? '',
                'logisticsPrimaryThroughput',
                Capacity.byId(creep.id)?.used ?? 0
            )
        }
        return result;
    }
}

export class DepotRequest extends LogisticsRequest {

    constructor(
        public pos: RoomPosition,
        public priority: number,
        public capacity: number = -1,
        public sourceType = SourceType.STORAGE
    ) {
        super(pos, priority, capacity, sourceType);
        if (this.capacity === -1) {
            this.capacity = STORAGE_CAPACITY
        }
    }

    action(creep: Creep) {
        // Wait for minions to request resources
        if (!Capacity.byId(creep.id)?.used) {
            this.completed = true;
            return OK;
        }
        if (!creep.pos.isNearTo(this.pos)) {
            return travel(creep, this.pos)
        }
        const result = creep.drop(RESOURCE_ENERGY);
        this.completed = (result === OK);
        if (this.completed && this.sourceType === SourceType.PRIMARY) {
            const statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
            statisticsAnalyst.reportMetric(
                global.boardroom.getClosestOffice(this.pos)?.name ?? '',
                'logisticsPrimaryThroughput',
                Capacity.byId(creep.id)?.used ?? 0
            )
        }
        return result;
    }
}

export class SupportRequest extends DepotRequest {
    constructor(
        public req: BuildRequest|RepairRequest,
        capacity: number
    ) {
        super(req.pos, req.priority, capacity, SourceType.STORAGE);
    }

    action(creep: Creep) {
        if (this.req.result && this.req.result !== BehaviorResult.INPROGRESS) {
            this.completed = true;
            return OK;
        }
        return super.action(creep)
    }
}

// profiler.registerClass(DepotRequest, 'DepotRequest');
// profiler.registerClass(TransferRequest, 'TransferRequest');
