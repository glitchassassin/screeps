import { getEnergyFromFranchise } from 'Behaviors/getEnergyFromFranchise';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { roomPlans } from 'Selectors/roomPlans';

export const withdraw =
  (fromStorage?: boolean) =>
  (
    data: {
      office: string;
      withdrawTarget?: Id<Source>;
      depositTarget?: Id<AnyStoreStructure | Creep>;
      repair?: boolean;
    },
    creep: Creep
  ) => {
    if (creep.ticksToLive && creep.ticksToLive < 100) {
      // no work within range and creep is dying
      return States.RECYCLE;
    }

    let energyCapacity = creep.store.getCapacity(RESOURCE_ENERGY) - creep.store[RESOURCE_ENERGY];

    if (energyCapacity === 0) return States.DEPOSIT;

    const storage = roomPlans(data.office)?.headquarters?.storage.structure as StructureStorage | undefined;
    if (fromStorage && storage?.store.getUsedCapacity(RESOURCE_ENERGY)) {
      moveTo(creep, { pos: storage.pos, range: 1 });
      creep.withdraw(storage, RESOURCE_ENERGY);
    } else {
      // Otherwise, continue to main withdraw target (set by src\Strategy\Logistics\LogisticsTargets.ts)
      const target = byId(data.withdrawTarget as Id<Source | StructureStorage>);
      const pos = posById(data.withdrawTarget) ?? target?.pos;
      if (!data.withdrawTarget || !pos) {
        return States.WITHDRAW;
      }

      // Target identified
      getEnergyFromFranchise(creep, data.office, data.withdrawTarget as Id<Source>);
      // Record cost
      HarvestLedger.record(data.office, data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }

    if (Game.cpu.bucket < 10000) return States.WITHDRAW;

    // only check for nearby targets if we have surplus CPU

    const nearby = lookNear(creep.pos);

    // Look for opportunity targets
    if (energyCapacity > 0) {
      // Dropped resources
      const resource = nearby.find(r => r.resource?.resourceType === RESOURCE_ENERGY);
      if (resource?.resource) {
        creep.pickup(resource.resource);
        energyCapacity = Math.max(0, energyCapacity - resource.resource.amount);
        LogisticsLedger.record(data.office, 'recover', Math.min(energyCapacity, resource.resource.amount));
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
          data.office,
          'recover',
          Math.min(energyCapacity, tombstone.tombstone?.store[RESOURCE_ENERGY])
        );
        energyCapacity = Math.max(0, energyCapacity - tombstone.tombstone?.store[RESOURCE_ENERGY]);
      }
    }

    return States.WITHDRAW;
  };
