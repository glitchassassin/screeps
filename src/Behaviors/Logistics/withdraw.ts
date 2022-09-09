import { BehaviorResult } from 'Behaviors/Behavior';
import { getEnergyFromFranchise } from 'Behaviors/getEnergyFromFranchise';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { Mission, MissionType } from 'Missions/Mission';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';

export const withdraw = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  let energyCapacity = creep.store.getFreeCapacity(RESOURCE_ENERGY);

  if (energyCapacity === 0) return States.FIND_DEPOSIT;

  // Otherwise, continue to main withdraw target
  const target = byId(mission.data.withdrawTarget as Id<Source | StructureStorage>);
  const pos = posById(mission.data.withdrawTarget) ?? target?.pos;
  if (!mission.data.withdrawTarget || !pos) {
    return States.FIND_WITHDRAW;
  }

  mission.efficiency.working += 1;

  // Target identified
  if (target instanceof StructureStorage) {
    const result = getEnergyFromStorage(creep, mission.office, undefined, true);
    if (result === BehaviorResult.SUCCESS) {
      return States.WITHDRAW;
    } else if (storageEnergyAvailable(mission.office) <= 50) {
      return States.FIND_WITHDRAW;
    }
  } else {
    if (franchiseEnergyAvailable(mission.data.withdrawTarget as Id<Source>) <= 50) {
      // console.log(creep.name, 'reassigned withdraw target', creep.pos.roomName, mission.office);
      return States.FIND_WITHDRAW;
    } else {
      const result = getEnergyFromFranchise(creep, mission.office, mission.data.withdrawTarget as Id<Source>);
      if (result === BehaviorResult.SUCCESS) {
        return States.WITHDRAW;
      }
      // Record cost
      HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }
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
