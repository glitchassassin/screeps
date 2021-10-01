import { roomPlans } from "Selectors/roomPlans";
import { getLabOrders } from "./getLabOrderDependencies";

export function planLabOrders(office: string) {
    // Prune completed orders
    Memory.offices[office].lab.orders = Memory.offices[office].lab.orders.filter(o => o.amount > 0);

    const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal|undefined;
    if (!terminal) return;

    // Maintain quota of ghodium acid for now
    if (Memory.offices[office].lab.orders.length === 0) {
        if (terminal.store.getUsedCapacity(RESOURCE_GHODIUM_ACID) < 10000) {
            Memory.offices[office].lab.orders = getLabOrders(RESOURCE_GHODIUM_ACID, 3000, terminal)
        }
    }
}
