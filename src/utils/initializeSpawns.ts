import { getSpawns, roomPlans } from "Selectors/roomPlans";

let done = false;

/**
 * Initializes first spawn for autoplacement in private servers
 */
export function initializeSpawn() {
  if (done) return;
  const offices = Object.keys(Memory.offices);
  if (offices.length === 1 && !getSpawns(offices[0]).length)
    // place initial spawn site
    if (roomPlans(offices[0])?.headquarters?.spawn.pos.createConstructionSite(STRUCTURE_SPAWN) === OK) {
      done = true;
    }
}
