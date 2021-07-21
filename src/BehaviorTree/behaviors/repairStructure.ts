import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedStructure, unwrapStructure } from "WorldState/Structures";

import { Health } from "WorldState/Health";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        repairSite?: CachedStructure
        repairToHits?: number
    }
}

/**
 * Returns FAILURE if health is unavailable, target is unavailable, or there is another error
 * Returns SUCCESS if health is greater than or equal to the target level
 * Returns INPROGRESS if repair command is successful
 */
export const repairStructure = (structure: CachedStructure, repairToHits?: number) => (creep: Creep, bb: Blackboard) => {
    if (!bb.repairSite) bb.repairSite = unwrapStructure(structure);
    if (bb.repairToHits === undefined) bb.repairToHits = repairToHits;

    let health = Health.byId(bb.repairSite.id);
    log('repairStructure', `health (target ${repairToHits}): ${health?.hits}/${health?.hitsMax}`)
    if (!health) return BehaviorResult.FAILURE;
    if (health.hits >= (bb.repairToHits !== undefined ? bb.repairToHits : health.hitsMax)) return BehaviorResult.SUCCESS;

    let target = byId(bb.repairSite.id);
    log('repairStructure', `target ${target?.pos} (${target?.structureType})`)
    if (!target) return BehaviorResult.FAILURE;

    let result = creep.repair(target);
    log('repairStructure', `result ${result}`)
    if (result === OK) return BehaviorResult.INPROGRESS;
    return BehaviorResult.FAILURE;
}
