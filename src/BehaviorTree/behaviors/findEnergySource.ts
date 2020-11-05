import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedResource, CachedStructure, CachedTombstone } from "WorldState";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        target?: CachedStructure<AnyStoreStructure>|CachedTombstone|CachedCreep|CachedResource<RESOURCE_ENERGY>
    }
}

export const findEnergySource = () => (creep: CachedCreep, bb: Blackboard) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    if (!bb.target) {
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let office = global.boardroom.offices.get(creep.memory.office || '');
        if (!office) return BehaviorResult.FAILURE;

        bb.target = logisticsAnalyst.getClosestAllSources(creep.pos);
    }
    return bb.target ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
