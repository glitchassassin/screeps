import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedStructure, unwrapStructure } from "WorldState/Structures";

import { Health } from "WorldState/Health";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        dismantleSite?: CachedStructure
    }
}

/**
 * Returns FAILURE if there is an error
 * Returns SUCCESS if target is destroyed
 * Returns INPROGRESS if dismantle command is successful
 */
export const dismantleStructure = (structure: CachedStructure) => (creep: Creep, bb: Blackboard) => {
    if (!bb.dismantleSite) bb.dismantleSite = unwrapStructure(structure);

    let health = Health.byId(bb.dismantleSite.id);
    let target = byId(bb.dismantleSite.id);
    log('dismantleStructure', `target ${target?.pos} (${target?.structureType}) [${health?.hits}/${health?.hitsMax}]`)
    if (!target) return BehaviorResult.SUCCESS;

    let result = creep.dismantle(target);
    log('dismantleStructure', `result ${result}`)
    if (result === OK) return BehaviorResult.INPROGRESS;
    return BehaviorResult.FAILURE;
}
