import { Health } from "WorldState/Health";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";

/**
 * Returns true if structure doesn't exist or needs repairs, false otherwise
 */
export const structureNeedsRepairs = (structure: PlannedStructure, repairToHits?: number) => {
    let health = Health.byId(structure.structureId)
    if (!health) return true; // Structure does not exist
    let hits = health.hits
    let hitsMax = repairToHits ?? health.hitsMax
    return hits < hitsMax;
}
