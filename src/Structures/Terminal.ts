import { roomPlans } from "Selectors/roomPlans";
import profiler from "utils/profiler";

const getSellPrice = (resourceType: ResourceConstant) => {
    return Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).reduce(
        (min, order) => Math.min(min, order.price),
        Infinity
    )
}

export const runTerminal = profiler.registerFN(function runTerminal(roomName: string) {
    const terminal = roomPlans(roomName)?.headquarters?.terminal.structure as StructureTerminal;
    if (!terminal) return;

    // Just sell all resources except energy
    for (let resource in terminal.store) {
        let resourceType = resource as ResourceConstant;
        if (resourceType === RESOURCE_ENERGY) continue;
        let order = Object.values(Game.market.orders).find(o => o.roomName === roomName && o.resourceType === resourceType)
        if (!order) {
            // Place a sell order
            Game.market.createOrder({
                type: ORDER_SELL,
                resourceType,
                price: getSellPrice(resourceType),
                totalAmount: terminal.store.getUsedCapacity(resourceType),
                roomName
            });
        }
    }
})
