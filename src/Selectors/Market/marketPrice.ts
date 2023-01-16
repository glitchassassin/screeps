import { memoizeByTick } from 'utils/memoizeFunction';

export const buyMarketPrice = memoizeByTick(
  (resourceType: MarketResourceConstant) => resourceType,
  (resourceType: MarketResourceConstant) =>
    Math.min(...Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).map(o => o.price), Infinity)
);
export const buyMarketEnergyPrice = memoizeByTick(
  (resourceType: MarketResourceConstant) => resourceType,
  (resourceType: MarketResourceConstant) => {
    const energyPrice = buyMarketPrice(RESOURCE_ENERGY);
    const resourcePrice = buyMarketPrice(resourceType);
    if (energyPrice === Infinity || energyPrice === 0) return resourcePrice;
    return resourcePrice / energyPrice;
  }
);
export const sellMarketPrice = memoizeByTick(
  (resourceType: MarketResourceConstant) => resourceType,
  (resourceType: MarketResourceConstant) =>
    Math.max(...Game.market.getAllOrders({ type: ORDER_BUY, resourceType }).map(o => o.price), 0)
);

declare global {
  namespace NodeJS {
    interface Global {
      appraise(type: ORDER_BUY | ORDER_SELL, resourceType: MarketResourceConstant, room: string): void;
      buyOrder(resourceType: MarketResourceConstant, totalAmount: number, roomName: string, price?: number): void;
      completeOrder(): void;
      myOrders(): void;
    }
  }
}

let currentOrder: Order | undefined;
let currentRoom: string | undefined;
global.appraise = (type: ORDER_BUY | ORDER_SELL, resourceType: MarketResourceConstant, room: string) => {
  let bestOrder;
  let bestCost;
  for (const order of Game.market.getAllOrders({ type, resourceType })) {
    if (!order.roomName) continue;
    const energyCost = Game.market.calcTransactionCost(order.amount, order.roomName, room);
    const totalCost = (energyCost * buyMarketPrice(RESOURCE_ENERGY)) / order.amount + order.price;
    if (!bestCost || totalCost < bestCost) {
      bestCost = totalCost;
      bestOrder = order;
    }
  }
  currentOrder = bestOrder;
  currentRoom = room;
  console.log('Best price:', JSON.stringify(bestOrder));
  console.log('Net cost:', bestCost);
  console.log('Use completeOrder() to seal the deal');
};

global.completeOrder = (amount?: number) => {
  if (!currentOrder || !currentRoom) {
    console.log('No order pending');
    return;
  }
  console.log('Ordering:', JSON.stringify(currentOrder), 'for room', currentRoom);
  const result = Game.market.deal(currentOrder.id, amount ?? currentOrder.amount, currentRoom);
  console.log('Order result:', result);
};

global.buyOrder = (resourceType: MarketResourceConstant, totalAmount: number, roomName: string, maxPrice?: number) => {
  const sellPrice = sellMarketPrice(resourceType) + 0.1;
  if (maxPrice !== undefined && sellPrice > maxPrice) {
    console.log('maxPrice', maxPrice, 'is greater than ideal buy price', sellPrice);
    return;
  }
  const price = Math.min(maxPrice ?? Infinity, sellPrice + 0.1);
  const result = Game.market.createOrder({ type: ORDER_BUY, resourceType, price, totalAmount, roomName });
  console.log(`Placed order for ${totalAmount} ${resourceType} at ${price} credits to ${roomName}: ${result}`);
};

global.myOrders = () => {
  for (const key in Game.market.orders) {
    console.log(JSON.stringify(Game.market.orders[key]));
  }
};
