import { MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { memoizeByTick } from 'utils/memoizeFunction';
import { getPrimarySpawn } from './getPrimarySpawn';
import { roomPlans } from './roomPlans';

export const storageEnergyAvailable = (roomName: string) => {
  const plan = roomPlans(roomName);
  if (!plan?.headquarters && !plan?.fastfiller) return 0;
  return (
    ((plan.headquarters?.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
    (plan.fastfiller?.containers.reduce(
      (sum, c) => sum + ((c.structure as StructureContainer)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0),
      0
    ) ?? 0) +
    (getPrimarySpawn(roomName)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0)
  );
};

export const fastfillerIsFull = (roomName: string) => {
  const plan = roomPlans(roomName)?.fastfiller;
  if (!plan) return true;
  return (
    plan.containers.every(
      c => !c.structure || (c.structure as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY) === 0
    ) &&
    plan.extensions.every(
      c => !c.structure || (c.structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) === 0
    ) &&
    plan.spawns.every(c => !c.structure || (c.structure as StructureSpawn).store.getFreeCapacity(RESOURCE_ENERGY) === 0)
  );
};

export const roomEnergyAvailable = memoizeByTick(
  office => office,
  (office: string) => {
    const plan = roomPlans(office);
    return (
      ((plan?.headquarters?.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
      (plan?.fastfiller?.containers.reduce(
        (sum, c) => sum + ((c.structure as StructureContainer)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0),
        0
      ) ?? 0) +
      Game.rooms[office].energyAvailable
    );
  }
);

export const energyInTransit = memoizeByTick(
  office => office,
  (office: string) => {
    // calculate fleet energy levels
    let fleetEnergy = 0;
    let fleetCapacity = 0;
    for (const mission of activeMissions(office).filter(isMission(MissionType.LOGISTICS))) {
      const creep = assignedCreep(mission);
      fleetEnergy += creep?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
      fleetCapacity += creep?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0;
    }

    // calculate franchise energy levels
    const franchiseEnergy = franchisesByOffice(office).reduce(
      (sum, { source }) => sum + franchiseEnergyAvailable(source),
      0
    );
    return fleetEnergy + Math.min(fleetCapacity, franchiseEnergy);
  }
);
