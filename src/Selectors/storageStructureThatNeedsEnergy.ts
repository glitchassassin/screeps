import { roomPlans } from './roomPlans';

export function storageStructureThatNeedsEnergy(office: string) {
  const hq = roomPlans(office)?.headquarters;
  const fastfiller = roomPlans(office)?.fastfiller;
  const backfill = roomPlans(office)?.backfill;
  const storage = hq?.storage.structure as StructureStorage;
  const spawn = fastfiller?.spawns
    .map(s => s.structure as StructureSpawn)
    .find(s => s && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY)) as StructureSpawn;
  const container = fastfiller?.containers
    .map(s => s.structure as StructureContainer)
    .find(s => s && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY)) as StructureContainer;
  const extension = backfill?.extensions
    .map(s => s.structure as StructureExtension)
    .find(s => s && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY)) as StructureExtension;
  const tower = backfill?.towers
    .map(s => s.structure as StructureTower)
    .find(s => s && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY)) as StructureTower;
  if (spawn) return spawn;
  if (storage?.store.getFreeCapacity(RESOURCE_ENERGY)) return storage;
  if (container) return container;
  if (extension) return extension;
  if (tower) return tower;
  return undefined;
}
