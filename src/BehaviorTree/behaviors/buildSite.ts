import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 *
 * Returns FAILURE if build site is not in blackboard
 * Returns SUCCESS if target could not be found (destroyed or completed)
 * If room is visible, builds and returns INPROGRESS
 * Otherwise, returns FAILURE
 */
export const buildSite = () => (creep: Creep, bb: Blackboard) => {
    if (!bb.buildSite) return BehaviorResult.FAILURE;
    let target = byId(bb.buildSite.id);
    log(creep.name, `buildSite ${target}`)
    if (Game.rooms[bb.buildSite.pos.roomName]) {
        if (!target) return BehaviorResult.SUCCESS;
        let result = creep.build(target);
        log(creep.name, `buildSite result: ${result}`)
        if (result === OK) return BehaviorResult.INPROGRESS;
    }

    return BehaviorResult.FAILURE
}
