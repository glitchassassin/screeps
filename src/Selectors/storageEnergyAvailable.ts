import { resourcesNearPos } from "./resourcesNearPos";
import { roomPlans } from "./roomPlans";

export const storageEnergyAvailable = (roomName: string) => {
    const plan = roomPlans(roomName)?.office
    if (!plan) return 0;
    return (plan.headquarters.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ??
        resourcesNearPos(plan.headquarters.storage.pos).reduce((sum, r) => sum + r.amount, 0)
}
