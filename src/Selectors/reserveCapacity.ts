export const getReservedUsedCapacity = (target: AnyStoreStructure | Creep, resource = RESOURCE_ENERGY) => {
  return target.store[resource];
};
export const getReservedFreeCapacity = (target: AnyStoreStructure | Creep, resource = RESOURCE_ENERGY) => {
  return target.store.getCapacity(resource) - target.store[resource];
};
export const reserveCapacity = (target: AnyStoreStructure | Creep, amount: number, resource = RESOURCE_ENERGY) => {
  target.store[resource] = Math.min(getReservedFreeCapacity(target), amount);
};
