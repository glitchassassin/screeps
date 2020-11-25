import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedConstructionSite, ConstructionSites } from "WorldState/ConstructionSites";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        buildSite?: CachedConstructionSite
    }
}

export const createConstructionSite = (pos: RoomPosition, type: BuildableStructureConstant) => (creep: Creep, bb: Blackboard) => {
    // If the site is already in the blackboard, no action needed
    if (bb.buildSite?.pos?.isEqualTo(pos) && bb.buildSite.structureType === type) return BehaviorResult.SUCCESS;

    let site = ConstructionSites.byPos(pos)

    // Create the construction site, if needed
    if (!site) {
        let result = pos.createConstructionSite(type);
        return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
    }

    // Otherwise, add it to the Blackboard
    if (site.structureType === type) {
        bb.buildSite = site;
        return BehaviorResult.SUCCESS;
    }

    // If none of the above worked, fail
    return BehaviorResult.FAILURE
}
