import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedConstructionSite, ConstructionSites, unwrapConstructionSite } from "WorldState/ConstructionSites";

import { Structures } from "WorldState/Structures";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        buildSite?: CachedConstructionSite
    }
}

/**
 * Returns SUCCESS if the site exists and in the blackboard, or if structure is completed
 * Returns INPROGRESS after attempting to create the construction site (waits a tick to confirm success)
 * Returns FAILURE if there is an error creating the construction site, or there is an existing construction site for a different structure
 * @param pos Position of construction site
 * @param type Constant of structure to build
 */
export const createConstructionSite = (pos: RoomPosition, type: BuildableStructureConstant) => (creep: Creep, bb: Blackboard) => {
    log(creep.id, `createConstructionSite ${pos} ${type}`);

    // If the room is not visible, fail
    if (!Game.rooms[pos.roomName]) return BehaviorResult.FAILURE;

    // If the site is already in the blackboard, no action needed
    if (bb.buildSite?.pos?.isEqualTo(pos) && bb.buildSite.structureType === type && byId(bb.buildSite.id)) return BehaviorResult.SUCCESS;

    let structures = Structures.byPos(pos);

    if (structures.some(structure => structure.structureType === type)) {
        // Structure already exists, no need to create site
        return BehaviorResult.SUCCESS;
    }

    let site = ConstructionSites.byPos(pos)

    // Create the construction site, if needed
    if (!site) {
        let result = pos.createConstructionSite(type);
        return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
    }

    // Otherwise, add it to the Blackboard
    if (site.structureType === type) {
        bb.buildSite = unwrapConstructionSite(site);
        return BehaviorResult.SUCCESS;
    }

    // If none of the above worked, fail
    return BehaviorResult.FAILURE
}
