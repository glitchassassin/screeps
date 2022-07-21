import { minionCost } from "./minionCostPerTick";

export const renewCost = (creep: Creep) => (minionCost(creep.body.map(p => p.type)) / 2.5 / creep.body.length);
