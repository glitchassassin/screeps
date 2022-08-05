export const minionCost = (body: BodyPartConstant[]) => {
  return body.reduce((sum, p) => sum + BODYPART_COST[p], 0);
};

export const minionCostPerTick = (body: BodyPartConstant[]) => {
  const lifetime = body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
  return minionCost(body) / lifetime;
};

export const creepCost = (creep: Creep) => {
  return minionCost(creep.body.map(p => p.type));
};

export const creepCostPerTick = (creep: Creep) => {
  return minionCostPerTick(creep.body.map(p => p.type));
};
