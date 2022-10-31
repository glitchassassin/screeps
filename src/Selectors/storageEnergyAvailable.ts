import { memoizeByTick } from 'utils/memoizeFunction';
import { getPrimarySpawn } from './getPrimarySpawn';
import { roomPlans } from './roomPlans';

export const storageEnergyAvailable = (roomName: string) => {
  const plan = roomPlans(roomName);
  if (!plan?.headquarters && !plan?.fastfiller) return 0;
  if (!plan.fastfiller?.containers.some(c => c.structure) && !plan.headquarters?.storage.structure)
    return getPrimarySpawn(roomName)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
  return (
    (plan.headquarters?.storage.structure?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
    (plan.fastfiller?.containers.reduce(
      (sum, c) => sum + (c.structure?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0),
      0
    ) ?? 0)
  );
};

export const fastfillerIsFull = (roomName: string) => {
  const plan = roomPlans(roomName)?.fastfiller;
  if (!plan) return true;
  return (
    plan.containers.every(c => !c.structure || c.structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0) &&
    plan.extensions.every(c => !c.structure || c.structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0) &&
    plan.spawns.every(c => !c.structure || c.structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0)
  );
};

export const roomEnergyAvailable = memoizeByTick(
  office => office,
  (office: string) => {
    const plan = roomPlans(office);
    return (
      (plan?.headquarters?.storage.structure?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
      (plan?.library?.container.structure?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
      (plan?.fastfiller?.containers.reduce(
        (sum, c) => sum + (c.structure?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0),
        0
      ) ?? 0)
    );
  }
);
