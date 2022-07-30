import { getSpawns, roomPlans } from 'Selectors/roomPlans';

let done = false;

/**
 * Initializes first spawn for autoplacement in private servers
 */
export function initializeSpawn() {
  if (done) return;
  const offices = Object.keys(Memory.offices);
  if (offices.length === 1 && !getSpawns(offices[0]).length)
    if (roomPlans(offices[0])?.fastfiller?.spawns[0].pos.createConstructionSite(STRUCTURE_SPAWN) === OK) {
      // place initial spawn site
      done = true;
    }
}
