import { getEnergyFromFranchise } from 'Behaviors/getEnergyFromFranchise';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { estimatedFreeCapacity, estimatedUsedCapacity, updateUsedCapacity } from 'Selectors/Logistics/predictiveCapacity';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { roomPlans } from 'Selectors/roomPlans';
import { logCpu, logCpuStart } from 'utils/logCPU';

export const withdraw =
  (fromStorage?: boolean) =>
  (
    data: {
      office: string;
      assignment: {
        withdrawTarget?: Id<Source>;
        depositTarget?: Id<AnyStoreStructure | Creep>;
        repair?: boolean;
      }
    },
    creep: Creep
  ) => {
    logCpuStart()
    if (creep.ticksToLive && creep.ticksToLive < 100) {
      // no work within range and creep is dying
      return States.RECYCLE;
    }

    const storage = roomPlans(data.office)?.headquarters?.storage.structure as StructureStorage | undefined;
    if (fromStorage && storage?.store.getUsedCapacity(RESOURCE_ENERGY)) {
      moveTo(creep, { pos: storage.pos, range: 1 });
      creep.withdraw(storage, RESOURCE_ENERGY);
    } else {
      // Otherwise, continue to main withdraw target (set by src\Strategy\Logistics\LogisticsTargets.ts)
      const target = byId(data.assignment.withdrawTarget as Id<Source | StructureStorage>);
      const pos = posById(data.assignment.withdrawTarget) ?? target?.pos;
      if (!data.assignment.withdrawTarget || !pos) {
        return States.WITHDRAW;
      }

      // Target identified
      getEnergyFromFranchise(creep, data.office, data.assignment.withdrawTarget as Id<Source>);
      // Record cost
      HarvestLedger.record(data.office, data.assignment.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }

    if (Game.cpu.bucket < 10000) return States.WITHDRAW;

    // only check for nearby targets if we have surplus CPU

    const nearby = lookNear(creep.pos);

    // Look for opportunity targets
    if (estimatedFreeCapacity(creep) > 0) {
      // Dropped resources
      const resource = nearby.find(r => r.resource?.resourceType === RESOURCE_ENERGY);
      if (resource?.resource) {
        if (creep.pickup(resource.resource) === OK) {
          const recovered = Math.min(resource.resource.amount, estimatedFreeCapacity(creep))
          LogisticsLedger.record(data.office, 'recover', recovered);
          updateUsedCapacity(creep, recovered);
        }
      }

      // Tombstones
      const tombstone = nearby.find(r => estimatedUsedCapacity(r.tombstone));
      if (tombstone?.tombstone) {
        if (creep.withdraw(tombstone.tombstone, RESOURCE_ENERGY) === OK) {
          const recovered = Math.min(estimatedUsedCapacity(tombstone.tombstone), estimatedFreeCapacity(creep))
          LogisticsLedger.record(
            data.office,
            'recover',
            recovered
          );
          updateUsedCapacity(tombstone.tombstone, -recovered);
          updateUsedCapacity(creep, recovered);
        }
      }
    }

    logCpu("opportunity targets")

    return States.WITHDRAW;
  };
