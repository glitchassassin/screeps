import { getRoomPathDistance } from 'Selectors/Map/Pathing';
import { buyMarketPrice } from 'Selectors/Market/marketPrice';

export const resourcesToPlunder = (office: string, room: string, lootResources: ResourceConstant[]) => {
  let pathDistance = getRoomPathDistance(office, room);
  if (pathDistance === undefined) return [];
  let trips = CREEP_LIFE_TIME / (pathDistance * 50);
  // cost of a single M/C segment, divided by the amount of resources it can move from this room
  const moveCost = (BODYPART_COST[CARRY] + BODYPART_COST[MOVE]) / Math.floor(CARRY_CAPACITY * trips);

  return lootResources.filter(resource => moveCost > buyMarketPrice(resource));
};
