import { roomPlans } from "./roomPlans";

export function storageStructureThatNeedsEnergy(office: string) {
    const hq = roomPlans(office)?.headquarters;
    const franchise1 = roomPlans(office)?.franchise1;
    const franchise2 = roomPlans(office)?.franchise2;
    const storage = hq?.storage.structure as StructureStorage;
    const spawn = (hq?.spawn.structure ?? franchise1?.spawn.structure?? franchise2?.spawn.structure) as StructureSpawn;
    const container = hq?.container.structure as StructureContainer;
    if (spawn?.store.getFreeCapacity(RESOURCE_ENERGY)) return spawn;
    if (storage?.store.getFreeCapacity(RESOURCE_ENERGY)) return storage;
    if (container?.store.getFreeCapacity(RESOURCE_ENERGY)) return container;
    return undefined;
}
