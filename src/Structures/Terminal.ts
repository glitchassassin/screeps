import { officeResourceSurplus } from "Selectors/officeResourceSurplus";
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
        if (terminalsUsed.has(office)) continue; // Already sent resources this tick

        const [targetOffice, targetAmount] = maxDeficits.get(resource) ?? [];
        if (targetOffice && targetAmount) {
            // Office should transfer resource to targetOffice
            const transferAmount = Math.min(Math.abs(amount), Math.abs(targetAmount));
            const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal;
            if (terminal && transferAmount > TERMINAL_SEND_THRESHOLD) {
                if (terminal.send(resource, transferAmount, targetOffice, 'BalancingResources') === OK) {
                    terminalsUsed.add(office);
                }
            }
        }
    }
})
