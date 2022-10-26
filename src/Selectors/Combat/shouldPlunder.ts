import { buyMarketPrice } from 'Selectors/Market/marketPrice';

export const resourcesToPlunder = (distance: number, lootResources: ResourceConstant[]) => {
  let trips = CREEP_LIFE_TIME / distance;
  // cost of a single M/C segment, divided by the amount of resources it can move from this room
  const moveCost = (BODYPART_COST[CARRY] + BODYPART_COST[MOVE]) / Math.floor(CARRY_CAPACITY * trips);

  return lootResources.filter(resource => moveCost > buyMarketPrice(resource));
};
