import { followPathHomeFromSource } from 'Behaviors/followPathHomeFromSource';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { MinionTypes } from 'Minions/minionTypes';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { estimatedFreeCapacity, estimatedUsedCapacity, updateUsedCapacity } from 'Selectors/Logistics/predictiveCapacity';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { plannedFranchiseRoads } from 'Selectors/plannedFranchiseRoads';
import { roomPlans } from 'Selectors/roomPlans';
import { fastfillerIsFull } from 'Selectors/storageEnergyAvailable';

export const deposit =
  (fromStorage?: boolean) =>
  (
    data: {
      office: string;
      assignment: {
        withdrawTarget?: Id<Source>;
        depositTarget?: Id<AnyStoreStructure | Creep>;
      }
    },
    creep: Creep
  ) => {
    let target = byId(data.assignment.depositTarget as Id<AnyStoreStructure | Creep>);
    const targetPos = target?.pos ?? roomPlans(data.office)?.headquarters?.storage.pos;
    if ((data.assignment.depositTarget && !target) || !targetPos) { // invalid target
      delete data.assignment.depositTarget;
      return States.DEPOSIT;
    }

    if (data.assignment.withdrawTarget && !fromStorage) {
      // Record deposit cost
      HarvestLedger.record(data.office, data.assignment.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }

    // travel home from a source
    if (data.assignment.withdrawTarget && !fromStorage && creep.pos.roomName !== data.office) {
      followPathHomeFromSource(creep, data.office, data.assignment.withdrawTarget);
    } else {
      // verify target
      if (creep.pos.roomName === data.office && !target) {
        // no assignment, stand by
        delete data.assignment.depositTarget;
        return States.DEPOSIT;
      }
      // move to target, or storage if target not assigned yet
      if (target || (creep.pos.roomName !== data.office && !data.assignment.depositTarget)) {
        moveTo(creep, { pos: targetPos, range: 1 }, { priority: 3 });
      }

      // try to transfer to target
      if (target) {
        const result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === OK) {
          const amount = Math.min(
            estimatedFreeCapacity(target),
            estimatedUsedCapacity(creep)
          );
          updateUsedCapacity(target, amount);
          if (data.assignment.withdrawTarget && !fromStorage) {
            // Record deposit amount
            HarvestLedger.record(data.office, data.assignment.withdrawTarget, 'deposit', amount);
            LogisticsLedger.record(data.office, 'deposit', -amount);
          }
          delete data.assignment.depositTarget;
        } else if (result === ERR_FULL) {
          delete data.assignment.depositTarget;
        }
        // If target is spawn, is not spawning, and is at capacity, renew this creep
        if (
          Game.cpu.bucket >= 10000 &&
          target instanceof StructureSpawn &&
          !target.spawning &&
          estimatedUsedCapacity(target) + estimatedUsedCapacity(creep)
        ) {
          target.renewCreep(creep);
        }
      }
    }

    if (Game.cpu.bucket < 10000) return States.DEPOSIT;

    // if we have CPU, repair and look for opportunity targets

    if (creep.getActiveBodyparts(WORK)) {
      const road = data.assignment.withdrawTarget
        ? plannedFranchiseRoads(data.office, data.assignment.withdrawTarget).find(
            s => s.energyToRepair > 0 && s.pos.inRangeTo(creep.pos, 3)
          )
        : undefined;
      if (road?.structure) {
        if (creep.repair(road.structure) === OK) {
          const cost = REPAIR_COST * REPAIR_POWER * 1; // Haulers will only ever have one work part // creep.body.filter(p => p.type === WORK).length;
          if (data.assignment.withdrawTarget && !(byId(data.assignment.withdrawTarget) instanceof Structure)) {
            // Record deposit cost
            HarvestLedger.record(data.office, data.assignment.withdrawTarget, 'repair', -cost);
            LogisticsLedger.record(data.office, 'deposit', -cost);
          }
        }
      }
    }

    // only check for nearby targets if we have surplus CPU

    const nearby = lookNear(creep.pos);

    if (!target || creep.pos.getRangeTo(target) > 1) {
      // Check for nearby targets of opportunity

      for (const opp of nearby) {
        if (opp.creep?.my) {
          if (
            opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            (([MinionTypes.ENGINEER, MinionTypes.RESEARCH].includes(opp.creep.memory.role) &&
              fastfillerIsFull(data.office)) ||
              opp.creep.name.startsWith('MRM_'))
          ) {
            if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
              const amount = Math.min(estimatedFreeCapacity(opp.creep), estimatedUsedCapacity(creep));
              updateUsedCapacity(creep, -amount);
              if (data.assignment.withdrawTarget && !(byId(data.assignment.withdrawTarget) instanceof Structure)) {
                // Record deposit amount
                HarvestLedger.record(data.office, data.assignment.withdrawTarget, 'deposit', amount);
                LogisticsLedger.record(data.office, 'deposit', -amount);
              }
              break;
            }
          }
        } else if (
          (opp.structure?.structureType === STRUCTURE_EXTENSION || opp.structure?.structureType === STRUCTURE_SPAWN) &&
          estimatedFreeCapacity(opp.structure as AnyStoreStructure) > 0
        ) {
          if (creep.transfer(opp.structure, RESOURCE_ENERGY) === OK) {
            const amount = Math.min(
              estimatedFreeCapacity(opp.structure as AnyStoreStructure),
              estimatedUsedCapacity(creep)
            );
            updateUsedCapacity(creep, -amount);
            if (data.assignment.withdrawTarget && !(byId(data.assignment.withdrawTarget) instanceof StructureStorage)) {
              // Record deposit amount
              HarvestLedger.record(data.office, data.assignment.withdrawTarget, 'deposit', amount);
              LogisticsLedger.record(data.office, 'deposit', -amount);
            }
            break;
          }
        }
      }
      if (estimatedUsedCapacity(creep) === 0) {
        delete data.assignment.withdrawTarget;
        return States.WITHDRAW;
      }
    }

    return States.DEPOSIT;
  };
