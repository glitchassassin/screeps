import { memoizeByTick } from 'utils/memoizeFunction';

export const buyMarketPrice = memoizeByTick(
  (resourceType: ResourceConstant) => resourceType,
  (resourceType: ResourceConstant) =>
    Math.min(...Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).map(o => o.price), Infinity)
);
