import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { States } from 'Behaviors/states';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { Mission, MissionType } from 'Missions/Mission';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { roomPlans } from 'Selectors/roomPlans';
import { bucketBrigadeWithdraw } from './bucketBrigade';

export const withdrawFromStorage = (
  mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>,
  creep: Creep
) => {
  delete mission.data.withdrawTarget;

  if (bucketBrigadeWithdraw(creep, mission)) {
    return States.DEPOSIT;
  }

  // Get energy from a franchise
  const storage = roomPlans(mission.office)?.headquarters?.storage.structure;

  if (!storage || (creep.ticksToLive && creep.ticksToLive < 50)) {
    // no work within range and creep is dying
    return States.RECYCLE;
  }

  getEnergyFromStorage(creep, mission.office, undefined, true);

  const nearby = lookNear(creep.pos);

  // Look for opportunity targets
  let energyCapacity = creep.store.getCapacity(RESOURCE_ENERGY) - creep.store[RESOURCE_ENERGY];
  if (energyCapacity > 0) {
    // Dropped resources
    const resource = nearby.find(r => r.resource?.resourceType === RESOURCE_ENERGY);
    if (resource?.resource) {
      creep.pickup(resource.resource);
      energyCapacity = Math.max(0, energyCapacity - resource.resource.amount);
      LogisticsLedger.record(mission.office, 'recover', Math.min(energyCapacity, resource.resource.amount));
    }

    // Tombstones
    const tombstone = nearby.find(r => r.tombstone?.store[RESOURCE_ENERGY]);
    if (tombstone?.tombstone) {
      creep.withdraw(tombstone.tombstone, RESOURCE_ENERGY);
      tombstone.tombstone.store[RESOURCE_ENERGY] = Math.max(
        0,
        tombstone.tombstone?.store[RESOURCE_ENERGY] - energyCapacity
      );
      LogisticsLedger.record(
        mission.office,
        'recover',
        Math.min(energyCapacity, tombstone.tombstone?.store[RESOURCE_ENERGY])
      );
      energyCapacity = Math.max(0, energyCapacity - tombstone.tombstone?.store[RESOURCE_ENERGY]);
    }
  }

  if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.DEPOSIT;

  return States.WITHDRAW;
};
