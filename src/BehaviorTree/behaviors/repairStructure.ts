import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedStructure, unwrapStructure } from "WorldState/Structures";

import { Health } from "WorldState/Health";
import { byId } from "utils/gameObjectSelectors";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        repairSite?: CachedStructure
        repairToHits?: number
    }
}

export const repairStructure = (structure: CachedStructure, repairToHits?: number) => (creep: Creep, bb: Blackboard) => {
    if (!bb.repairSite) bb.repairSite = unwrapStructure(structure);
    if (bb.repairToHits === undefined) bb.repairToHits = repairToHits;

    let health = Health.byId(bb.repairSite.id);
    if (!health) return BehaviorResult.FAILURE;
    if (health.hits >= (bb.repairToHits !== undefined ? bb.repairToHits : health.hitsMax)) return BehaviorResult.SUCCESS;

    let target = byId(bb.repairSite.id);
    if (!target) return BehaviorResult.FAILURE;

    let result = creep.repair(target);
    if (result === OK) return BehaviorResult.INPROGRESS;
    if (result === ERR_NOT_ENOUGH_ENERGY) return BehaviorResult.SUCCESS;
    return BehaviorResult.FAILURE;
}
