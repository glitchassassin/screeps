import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { CachedConstructionSite, ConstructionSites, unwrapConstructionSite } from "WorldState/ConstructionSites";

import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
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
export const createConstructionSite = (structure: PlannedStructure) => (creep: Creep, bb: Blackboard) => {
    log(creep.name, `createConstructionSite ${structure.pos} ${structure.structureType}`);

    // If the room is not visible, fail
    if (!Game.rooms[structure.pos.roomName]) return BehaviorResult.FAILURE;

    // If the site is already in the blackboard, no action needed
    if (bb.buildSite?.pos?.isEqualTo(structure.pos) && bb.buildSite.structureType === structure.structureType && byId(bb.buildSite.id)) return BehaviorResult.SUCCESS;

    if (structure.structure) {
        // Structure already exists, no need to create site
        return BehaviorResult.SUCCESS;
    }

    let site = ConstructionSites.byPos(structure.pos)

    // Create the construction site, if needed
    if (!site) {
        let result = structure.pos.createConstructionSite(structure.structureType);
        log(creep.name, `createConstructionSite result: ${result}`)
        if (result === ERR_INVALID_TARGET) return BehaviorResult.SUCCESS;
        return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE
    }

    // Otherwise, add it to the Blackboard
    if (site.structureType === structure.structureType) {
        bb.buildSite = unwrapConstructionSite(site);
        return BehaviorResult.SUCCESS;
    }

    // If none of the above worked, fail
    return BehaviorResult.FAILURE
}
