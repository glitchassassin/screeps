import { roomPlans } from "./roomPlans";

export const storageEnergyAvailable = (roomName: string) => {
    const plan = roomPlans(roomName)
    if (!plan?.headquarters) return 0;
    return (plan.headquarters.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ??
           (plan.headquarters.container.structure as StructureContainer)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0
}
