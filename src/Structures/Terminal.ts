import { officeResourceSurplus } from "Selectors/officeResourceSurplus";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import profiler from "utils/profiler";

const getSellPrice = (resourceType: ResourceConstant) => {
    return Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).reduce(
        (min, order) => Math.min(min, order.price),
        Infinity
    )
}

const TERMINAL_SEND_THRESHOLD = 100;

export const runTerminals = profiler.registerFN(function runTerminals() {
    const maxDeficits = new Map<ResourceConstant, [string, number]>();
    const maxSurpluses = new Map<ResourceConstant, [string, number]>();
    const terminalsUsed = new Set<string>();

    for (let office in Memory.offices) {
        if (!roomPlans(office)?.headquarters?.terminal.structure) continue;

        const surpluses = officeResourceSurplus(office);
        for (let [resource, amount] of surpluses) {
            if ((maxDeficits.get(resource)?.[1] ?? 0) > amount) {
                maxDeficits.set(resource, [office, amount])
            }
            if ((maxSurpluses.get(resource)?.[1] ?? 0) < amount) {
                maxSurpluses.set(resource, [office, amount])
            }
        }
    }
    for (let [resource, [office, amount]] of maxSurpluses) {
        const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal|undefined;
        if (terminalsUsed.has(office) || !terminal || terminal?.cooldown) continue; // Already sent resources this tick
        if (resource === RESOURCE_ENERGY && rcl(office) !== 8) continue; // Surplus energy should go to upgrading this room

        const [targetOffice, targetAmount] = maxDeficits.get(resource) ?? [];
        if (targetOffice && targetAmount && targetAmount > TERMINAL_SEND_THRESHOLD) {
            // Office should transfer resource to targetOffice
            const transferAmount = Math.min(Math.abs(amount), Math.abs(targetAmount));
            if (transferAmount > TERMINAL_SEND_THRESHOLD) {
                if (terminal.send(resource, transferAmount, targetOffice, 'BalancingResources') === OK) {
                    terminalsUsed.add(office);
                }
            }
        } else if (resource !== RESOURCE_ENERGY && amount > TERMINAL_SEND_THRESHOLD) {
            // Do not sell surplus energy
            const order = _.max(Game.market.getAllOrders(o => o.resourceType === resource && o.type === ORDER_BUY && o.amount > 0), o => o.price)

            if (order) {
                Game.market.deal(order.id, Math.min(amount, order.amount), office)
            }
        }
    }
    for (let [resource, [office, amount]] of maxDeficits) {
        const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal|undefined;
        if (terminalsUsed.has(office) || !terminal || terminal?.cooldown) continue; // Already sent resources this tick
        if (resource === RESOURCE_ENERGY) continue; // don't buy energy

        const [targetOffice] = maxSurpluses.get(resource) ?? [];
        if (!targetOffice && Math.abs(amount) > TERMINAL_SEND_THRESHOLD) {
            // No surplus of this product available, buy it on the market
            const order = _.min(Game.market.getAllOrders(o => o.resourceType === resource && o.type === ORDER_SELL && o.amount > 0 && o.price < Game.market.credits), o => o.price)
            if (order) {
                const result = Game.market.deal(order.id, Math.min(Math.abs(amount), order.amount), office)
                // console.log(
                //     result,
                //     JSON.stringify(order, null, 2),
                //     Math.min(Math.abs(amount), order.amount),
                //     office,
                //     order.roomName ? Game.market.calcTransactionCost(Math.min(Math.abs(amount), order.amount), office, order.roomName) : 0
                // )
            }
        }
    }
})
