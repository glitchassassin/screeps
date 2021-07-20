import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";

export const resourcesAvailable = (pos: RoomPosition, includeAdjacent = true, amount = 0) => (creep: Creep, bb: Blackboard) => {
    let available = LogisticsAnalyst.countEnergyInContainersOrGround(pos, includeAdjacent);
    return (available >= amount) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

export const noResourcesAvailable = (pos: RoomPosition, includeAdjacent = true) => (creep: Creep, bb: Blackboard) => {
    let available = LogisticsAnalyst.countEnergyInContainersOrGround(pos, includeAdjacent);
    return (available === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
