import { roomPlans } from "Selectors/roomPlans";
import { getLabOrders } from "./getLabOrderDependencies";

export function planLabOrders(office: string) {
    // Prune completed orders
    Memory.offices[office].labOrders = Memory.offices[office].labOrders.filter(o => o.amount > 0);

    const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal|undefined;
    if (!terminal) return;

    // Maintain quotas of ghodium and hydroxide for now
    if (Memory.offices[office].labOrders.length === 0) {
        if (terminal.store.getUsedCapacity(RESOURCE_GHODIUM) < 10000) {
            Memory.offices[office].labOrders = getLabOrders(RESOURCE_GHODIUM, 3000, terminal)
        } else if (terminal.store.getUsedCapacity(RESOURCE_HYDROXIDE) < 10000) {
            Memory.offices[office].labOrders = getLabOrders(RESOURCE_HYDROXIDE, 3000, terminal)
        }
    }
}
