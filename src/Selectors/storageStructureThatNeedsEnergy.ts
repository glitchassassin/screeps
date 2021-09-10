import { roomPlans } from "./roomPlans";

export function storageStructureThatNeedsEnergy(office: string) {
    const hq = roomPlans(office)?.headquarters;
    const storage = hq?.storage.structure as StructureStorage;
    const spawn = hq?.spawn.structure as StructureSpawn;
    const container = hq?.container.structure as StructureContainer;
    if (spawn?.store.getFreeCapacity(RESOURCE_ENERGY)) return spawn;
    if (storage?.store.getFreeCapacity(RESOURCE_ENERGY)) return storage;
    if (container?.store.getFreeCapacity(RESOURCE_ENERGY)) return container;
    return undefined;
}
