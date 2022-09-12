import { getEnergyFromFranchise } from 'Behaviors/getEnergyFromFranchise';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { Mission, MissionType } from 'Missions/Mission';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { bucketBrigadeWithdraw } from './bucketBrigade';

export const withdraw = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  if (bucketBrigadeWithdraw(creep, mission)) {
    return States.DEPOSIT;
  }
  if (creep.ticksToLive && creep.ticksToLive < 100) {
    // no work within range and creep is dying
    return States.RECYCLE;
  }

  let energyCapacity = creep.store.getCapacity(RESOURCE_ENERGY) - creep.store[RESOURCE_ENERGY];

  if (energyCapacity === 0) return States.DEPOSIT;

  // Otherwise, continue to main withdraw target
  const target = byId(mission.data.withdrawTarget as Id<Source | StructureStorage>);
  const pos = posById(mission.data.withdrawTarget) ?? target?.pos;
  if (!mission.data.withdrawTarget || !pos) {
    return States.WITHDRAW;
  }

  mission.efficiency.working += 1;

  // Target identified
  if (mission.type === MissionType.MOBILE_REFILL) {
    getEnergyFromStorage(creep, mission.office, undefined, true);
  } else {
    getEnergyFromFranchise(creep, mission.office, mission.data.withdrawTarget as Id<Source>);
    // Record cost
    HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
  }

  const nearby = lookNear(creep.pos);

  // Look for opportunity targets
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

  return States.WITHDRAW;
};
