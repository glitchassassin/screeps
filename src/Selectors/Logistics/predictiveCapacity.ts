import { memoizeOncePerTick } from "utils/memoizeFunction";

const energyCache = memoizeOncePerTick(() => new Map<Id<Creep|AnyStoreStructure|Tombstone>, number>());

export const estimatedUsedCapacity = (target?: Creep|AnyStoreStructure|Tombstone) => {
  if (!target) return 0;
  const cache = energyCache();
  if (!cache.has(target.id)) {
    cache.set(target.id, target.store.getUsedCapacity(RESOURCE_ENERGY));
  }
  return cache.get(target.id) ?? 0;
}
export const updateUsedCapacity = (target: Creep|AnyStoreStructure|Tombstone, delta: number) => {
  const cache = energyCache();
  cache.set(target.id, Math.max(0, Math.min(target.store.getCapacity(RESOURCE_ENERGY) ?? 0, (cache.get(target.id) ?? 0) + delta)));
}
export const estimatedFreeCapacity = (target?: Creep|AnyStoreStructure|Tombstone) => {
  if (!target) return 0;
  return Math.max(0,
    (target.store.getCapacity(RESOURCE_ENERGY) ?? 0) - estimatedUsedCapacity(target)
  );
}
