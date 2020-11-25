import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { byId } from "utils/gameObjectSelectors";

/**
 * Relies on Blackboard.buildSite to be populated by createConstructionSite
 */
export const buildSite = () => (creep: Creep, bb: Blackboard) => {
    if (!bb.buildSite) return BehaviorResult.FAILURE;
    let target = byId(bb.buildSite.id);
    if (Game.rooms[bb.buildSite.pos.roomName]) {
        if (!target) return BehaviorResult.SUCCESS;
        let result = creep.build(target);
        return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
    }

    return BehaviorResult.FAILURE
}
