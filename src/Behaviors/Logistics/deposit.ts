import { followPathHomeFromSource } from 'Behaviors/followPathHomeFromSource';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { MinionTypes } from 'Minions/minionTypes';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { fastfillerIsFull } from 'Selectors/storageEnergyAvailable';

export const deposit =
  (fromStorage?: boolean) =>
  (
    data: {
      office: string;
      withdrawTarget?: Id<Source>;
      depositTarget?: Id<AnyStoreStructure | Creep>;
    },
    creep: Creep
  ) => {
    if (creep.store[RESOURCE_ENERGY] <= 0) {
      delete data.withdrawTarget;
      delete data.depositTarget;
      return States.WITHDRAW;
    }
    let target = byId(data.depositTarget as Id<AnyStoreStructure | Creep>);

    if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
      delete data.depositTarget;
      return States.DEPOSIT;
    }

    if (data.withdrawTarget && !fromStorage) {
      // Record deposit cost
      HarvestLedger.record(data.office, data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }

    // travel home from a source
    if (data.withdrawTarget && !fromStorage && creep.pos.roomName !== data.office) {
      followPathHomeFromSource(creep, data.office, data.withdrawTarget);
    } else {
      moveTo(creep, { pos: target.pos, range: 1 }, { priority: 3 });
      if (creep.transfer(target, RESOURCE_ENERGY) === OK) {
        const amount = Math.min(
          target.store.getFreeCapacity(RESOURCE_ENERGY),
          creep.store.getUsedCapacity(RESOURCE_ENERGY)
        );
        target.store[RESOURCE_ENERGY] += amount;
        if (data.withdrawTarget && !fromStorage) {
          // Record deposit amount
          HarvestLedger.record(data.office, data.withdrawTarget, 'deposit', amount);
          LogisticsLedger.record(data.office, 'deposit', -amount);
        }
        delete data.depositTarget;
      }
      // If target is spawn, is not spawning, and is at capacity, renew this creep
      if (
        target instanceof StructureSpawn &&
        !target.spawning &&
        target.store.getUsedCapacity(RESOURCE_ENERGY) + creep.store.getUsedCapacity(RESOURCE_ENERGY)
      ) {
        target.renewCreep(creep);
      }
    }

    if (Game.cpu.bucket < 1000) return States.DEPOSIT;

    // if we have CPU, repair and look for opportunity targets

    if (creep.getActiveBodyparts(WORK)) {
      const road = creep.pos
        .findInRange(FIND_STRUCTURES, 3)
        .find(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax);
      if (road) {
        if (creep.repair(road) === OK) {
          const cost = REPAIR_COST * REPAIR_POWER * 1; // Haulers will only ever have one work part // creep.body.filter(p => p.type === WORK).length;
          if (data.withdrawTarget && !(byId(data.withdrawTarget) instanceof Structure)) {
            // Record deposit cost
            HarvestLedger.record(data.office, data.withdrawTarget, 'repair', -cost);
            LogisticsLedger.record(data.office, 'deposit', -cost);
          }
        }
      }
    }

    // only check for nearby targets if we have surplus CPU

    const nearby = lookNear(creep.pos);

    if (!target || creep.pos.getRangeTo(target) > 1) {
      // Check for nearby targets of opportunity
      let energyRemaining = creep.store[RESOURCE_ENERGY];

      for (const opp of nearby) {
        if (opp.creep?.my) {
          if (
            opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            (([MinionTypes.ENGINEER, MinionTypes.RESEARCH].includes(opp.creep.memory.role) &&
              fastfillerIsFull(data.office)) ||
              opp.creep.name.startsWith('MRM_'))
          ) {
            if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
              const amount = Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
              energyRemaining -= amount;
              if (data.withdrawTarget && !(byId(data.withdrawTarget) instanceof Structure)) {
                // Record deposit amount
                HarvestLedger.record(data.office, data.withdrawTarget, 'deposit', amount);
                LogisticsLedger.record(data.office, 'deposit', -amount);
              }
              break;
            }
          }
        } else if (
          (opp.structure?.structureType === STRUCTURE_EXTENSION || opp.structure?.structureType === STRUCTURE_SPAWN) &&
          (opp.structure as AnyStoreStructure).store[RESOURCE_ENERGY] <
            (opp.structure as AnyStoreStructure).store.getCapacity(RESOURCE_ENERGY)
        ) {
          if (creep.transfer(opp.structure, RESOURCE_ENERGY) === OK) {
            const amount = Math.min(
              (opp.structure as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY),
              energyRemaining
            );
            energyRemaining -= amount;
            if (data.withdrawTarget && !(byId(data.withdrawTarget) instanceof StructureStorage)) {
              // Record deposit amount
              HarvestLedger.record(data.office, data.withdrawTarget, 'deposit', amount);
              LogisticsLedger.record(data.office, 'deposit', -amount);
            }
            break;
          }
        }
      }
      if (energyRemaining === 0) {
        delete data.withdrawTarget;
        return States.WITHDRAW;
      }
    }

    return States.DEPOSIT;
  };
