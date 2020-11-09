import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedConstructionSite, CachedCreep } from "WorldState/";

import { lazyFilter } from "utils/lazyIterators";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        buildSite?: CachedConstructionSite
    }
}

export const createConstructionSite = (pos: RoomPosition, type: BuildableStructureConstant) => (creep: CachedCreep, bb: Blackboard) => {
    // If the site is already in the blackboard, no action needed
    if (bb.buildSite?.pos?.isEqualTo(pos) && bb.buildSite.structureType === type) return BehaviorResult.SUCCESS;

    let sites = Array.from(lazyFilter(
        global.worldState.constructionSites.byRoom.get(pos.roomName) ?? [],
        s => s.pos.isEqualTo(pos)
    ));

    // Create the construction site, if needed
    if (sites.length === 0) {
        let result = pos.createConstructionSite(type);
        return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
    }

    // Otherwise, add it to the Blackboard
    let [site] = sites;
    if (site.structureType === type) {
        bb.buildSite = site;
        return BehaviorResult.SUCCESS;
    }

    // If none of the above worked, fail
    return BehaviorResult.FAILURE
}
