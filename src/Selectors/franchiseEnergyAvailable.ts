import { getFranchisePlanBySourceId } from "./roomPlans";
import { posById } from "./posById";
import { resourcesNearPos } from "./resourcesNearPos";

export const franchiseEnergyAvailable = (source: Id<Source>) => {
    const pos = posById(source)
    if (!pos) return 0;

    const container = getFranchisePlanBySourceId(source)?.container.structure as StructureContainer|undefined

    return (
        resourcesNearPos(pos, 1, RESOURCE_ENERGY).reduce((sum, r) => sum + r.amount, 0) +
        (container?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0)
    )
}
