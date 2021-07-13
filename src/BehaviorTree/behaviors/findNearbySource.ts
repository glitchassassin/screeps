import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { MapAnalyst } from "Analysts/MapAnalyst";
import { Sources } from "WorldState/Sources";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        harvestTarget?: Id<Source>
        targetPos?: RoomPosition
    }
}

/**
 * @returns FAILURE if unable to get the office, or if no target is found; SUCCESS if a valid target is chosen
 */
export const findNearbySource = (radius?: number) => (creep: Creep, bb: Blackboard) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    if (!bb.harvestTarget || !byId(bb.harvestTarget) || !bb.targetPos) {
        // Prefer sources that can fill the minion, even if they're further away
        let target = Sources.byRoom(creep.pos.roomName).sort(MapAnalyst.sortByDistanceTo(creep.pos)).shift()

        if (radius !== undefined && target && creep.pos.getRangeTo(target.pos) > radius) {
            log(creep.name, `findEnergySource: ${creep.pos} has no sources in radius ${radius}`)
        } else {
            bb.harvestTarget = target?.id;
            bb.targetPos = target?.pos;
            log(creep.name, `findEnergySource: ${creep.pos} to ${byId(bb.harvestTarget)} @ ${bb.targetPos} (range ${bb.targetPos?.getRangeTo(creep.pos)})`)
        }
    }
    return bb.harvestTarget ? BehaviorResult.SUCCESS : BehaviorResult.FAILURE;
}
