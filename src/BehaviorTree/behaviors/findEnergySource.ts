import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        target?: Id<AnyStoreStructure|Tombstone|Creep|Resource<RESOURCE_ENERGY>>
        targetPos?: RoomPosition
    }
}

/**
 * @returns FAILURE if unable to get the office, or if no target is found; SUCCESS if a valid target is chosen
 */
export const findEnergySource = (radius?: number) => (creep: Creep, bb: Blackboard) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    if (!bb.target || !byId(bb.target) || !bb.targetPos) {
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let office = global.boardroom.offices.get(creep.memory.office || '');
        if (!office) return BehaviorResult.FAILURE;

        // Prefer sources that can fill the minion, even if they're further away
        let target = logisticsAnalyst.getClosestAllSources(creep.pos, Capacity.byId(creep.id)?.free);

        if (radius !== undefined && target && creep.pos.getRangeTo(target.pos) > radius) {
            log(creep.name, `findEnergySource: ${creep.pos} has no sources in radius ${radius}`)
        } else {
            bb.target = target?.id;
            bb.targetPos = target?.pos;
            log(creep.name, `findEnergySource: ${creep.pos} to ${byId(bb.target)} @ ${bb.targetPos} (range ${bb.targetPos?.getRangeTo(creep.pos)})`)
        }
    }
    return bb.target ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
