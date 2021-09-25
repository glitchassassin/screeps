import { posById } from "./posById";
import { resourcesNearPos } from "./resourcesNearPos";
import { getFranchisePlanBySourceId } from "./roomPlans";

export const franchiseEnergyAvailable = (source: Id<Source>, minions?: Creep[]) => {
    const pos = posById(source)
    if (!pos) return 0;

    const container = getFranchisePlanBySourceId(source)?.container.structure as StructureContainer|undefined

    let amount = (
        resourcesNearPos(pos, 1, RESOURCE_ENERGY).reduce((sum, r) => sum + r.amount, 0) +
        (container?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0)
    )
    if (minions?.length) {
        amount -= minions.reduce((sum, c) => sum + c.store.getFreeCapacity(RESOURCE_ENERGY), 0)
    }
    return amount;
}
