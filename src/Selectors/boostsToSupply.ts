import { byId } from "./byId";
import { getLabs } from "./getLabs";

export function boostsToSupply(office: string) {
    const boostOrders = Memory.offices[office].lab.boosts;
    const labs = getLabs(office);

    const resources = new Map<ResourceConstant, number>();

    for (const order of boostOrders) {
        // Subtract any already-boosted parts from the orders
        const c = byId(order.id);
        const orderResources = order.boosts.reduce((map, boost) => {
            map.set(boost.type, map.get(boost.type) ?? 0 + boost.count);
            return map;
        }, new Map<ResourceConstant, number>())
        if (!c) continue;
        c.body.forEach(part => {
            const amount = orderResources.get(part.boost as ResourceConstant)
            if (amount) {
                orderResources.set(part.boost as ResourceConstant, amount - 1)
            }
        })

        // Add remaining resources to quotas
        for (const [resource, amount] of orderResources.entries()) {
            resources.set(resource, (resources.get(resource) ?? 0) + amount);
        }
    }

    for (const boostLab of labs.boosts) {
        const lab = boostLab.structure as StructureLab|undefined;
        const resource = Object.keys(lab?.store ?? {})[0] as ResourceConstant|undefined;
        if (!lab || !resource) continue;

        const amount = lab.store.getUsedCapacity(resource);
        if (!resources.has(resource)) return true; // Should empty unneeded boosts
        if (amount && amount < resources.get(resource)!) return true; // Need more boosts to fulfill orders
        resources.delete(resource); // Sufficient capacity to meet quota
    }

    return resources; // Resources that need to be stocked
}
