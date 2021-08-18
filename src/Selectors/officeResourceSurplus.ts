import { roomPlans } from "./roomPlans";

export function officeResourceSurplus(office: string) {
    const totals = new Map<ResourceConstant, number>();
    const plan = roomPlans(office)?.headquarters;
    for (let [resource, amount] of Object.entries(Memory.offices[office].resourceQuotas)) {
        if (resource === undefined || amount === undefined) continue;
        totals.set(
            resource as ResourceConstant,
            -amount + ((plan?.terminal.structure as StructureTerminal)?.store.getUsedCapacity(resource as ResourceConstant) ?? 0)
        );
    }
    return totals;
}
