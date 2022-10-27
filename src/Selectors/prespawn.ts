/**
 * Returns true if creep doesn't need to be replaced
 * Can filter a list of creeps to those that don't need to be replaced
 */
export const prespawnByArrived = (creep: Creep) =>
  creep.ticksToLive === undefined || creep.memory.arrived === undefined || creep.ticksToLive > creep.memory.arrived;

/**
 * Set arrived timestamp, if not already set
 */
export const setArrived = (creep: Creep) => {
  const lifetime = creep.body.some(p => p.type === CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
  if (!creep.memory.arrived && creep.ticksToLive) {
    creep.memory.arrived = lifetime - creep.ticksToLive; // creep life time
  }
};
