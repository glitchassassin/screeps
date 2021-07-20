import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";

/**
 * @returns SUCCESS if energy is full, FAILURE otherwise
 */
export const creepCapacityFull = (resource?: ResourceConstant) => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id, resource)?.free === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

/**
 * @returns SUCCESS if energy is not full, FAILURE otherwise
 */
export const creepCapacityNotFull = (resource?: ResourceConstant) => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id, resource)?.free !== 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

/**
 * @returns SUCCESS if energy is empty, FAILURE otherwise
 */
export const creepCapacityEmpty = (resource?: ResourceConstant) => (creep: Creep, bb: Blackboard) => {
    return (Capacity.byId(creep.id, resource)?.used === 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}

/**
 * @returns SUCCESS if energy is full, FAILURE otherwise
 */
export const structureCapacityFull = (structure: PlannedStructure, resource?: ResourceConstant) => (creep: Creep, bb: Blackboard) => {
    let capacity = Capacity.byId(structure.structureId as Id<AnyStoreStructure>, resource)?.free;
    if (capacity === undefined) {
        capacity = CONTAINER_CAPACITY - LogisticsAnalyst.countEnergyInContainersOrGround(structure.pos, false, resource)
    }
    return (capacity <= 0) ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
