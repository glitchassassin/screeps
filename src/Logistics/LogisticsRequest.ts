import { travel } from "TaskRequests/activity/Travel";
import { getCapacity } from "utils/gameObjectSelectors";

export class LogisticsRequest {
    public pos: RoomPosition;
    public completed = false;
    public resupply = false;

    constructor(
        public target: AnyStoreStructure,
        public priority: number = 5,
        public capacity: number = -1,
    ) {
        this.pos = target.pos;
        if (this.capacity === -1) {
            this.capacity = getCapacity(target);
        }
    }

    transfer(creep: Creep) {
        let result = creep.transfer(this.target, RESOURCE_ENERGY);
        if (result === OK) {
            this.completed = true;
        } else if (result === ERR_NOT_IN_RANGE) {
            return travel(creep, this.pos)
        }
        return result;
    }
}

export class ResupplyRequest extends LogisticsRequest {
    public resupply = true;
}
