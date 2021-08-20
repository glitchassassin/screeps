import { resourcesNearPos } from "./resourcesNearPos";
import { roomPlans } from "./roomPlans";

export const storageEnergyAvailable = (roomName: string) => {
    const plan = roomPlans(roomName)
    if (!plan?.headquarters) return 0;
    return (plan.headquarters.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ??
        resourcesNearPos(plan.headquarters.storage.pos, 1, RESOURCE_ENERGY).reduce((sum, r) => sum + r.amount, 0)
}
