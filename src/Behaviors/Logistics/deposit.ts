import { followPathHomeFromSource } from 'Behaviors/followPathHomeFromSource';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { fastfillerIsFull } from 'Selectors/storageEnergyAvailable';
import { bucketBrigadeDeposit } from './bucketBrigade';

export const deposit = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  if (creep.store[RESOURCE_ENERGY] <= 0) {
    delete mission.data.withdrawTarget;
    return States.WITHDRAW;
  }
  let target = byId(mission.data.depositTarget as Id<AnyStoreStructure | Creep>);

  if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
    return States.DEPOSIT;
  }

  mission.efficiency.working += 1;

  if (mission.data.repair) {
    const road = creep.pos
      .findInRange(FIND_STRUCTURES, 3)
      .find(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax);
    if (road) {
      if (creep.repair(road) === OK) {
        const cost = REPAIR_COST * REPAIR_POWER * 1; // Haulers will only ever have one work part // creep.body.filter(p => p.type === WORK).length;
        if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof Structure)) {
          // Record deposit cost
          HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'repair', -cost);
          LogisticsLedger.record(mission.office, 'deposit', -cost);
        }
      }
    }
  }

  const nearby = lookNear(creep.pos);

  if (!target || creep.pos.getRangeTo(target) > 1) {
    if (bucketBrigadeDeposit(creep, mission)) {
      delete mission.data.withdrawTarget;
      return States.WITHDRAW;
    }

    // Check for nearby targets of opportunity
    let energyRemaining = creep.store[RESOURCE_ENERGY];

    for (const opp of nearby) {
      if (opp.creep?.my) {
        if (
          opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          (((opp.creep.name.startsWith('ENGINEER') || opp.creep.name.startsWith('RESEARCH')) &&
            fastfillerIsFull(mission.office)) ||
            opp.creep.name.startsWith('REFILL'))
        ) {
          if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
            const amount = Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
            energyRemaining -= amount;
            if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof Structure)) {
              // Record deposit amount
              HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'deposit', amount);
              LogisticsLedger.record(mission.office, 'deposit', -amount);
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
          if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof StructureStorage)) {
            // Record deposit amount
            HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'deposit', amount);
            LogisticsLedger.record(mission.office, 'deposit', -amount);
          }
          break;
        }
      }
    }
    if (energyRemaining === 0) {
      delete mission.data.withdrawTarget;
      return States.WITHDRAW;
    }
  }
  if (!target) return States.DEPOSIT;

  if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof Structure)) {
    // Record deposit cost
    HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
  }

  // travel home from a source
  if (
    mission.data.withdrawTarget &&
    !(byId(mission.data.withdrawTarget) instanceof Structure) &&
    creep.pos.roomName !== mission.office
  ) {
    followPathHomeFromSource(creep, mission.office, mission.data.withdrawTarget);
  } else {
    moveTo(creep, { pos: target.pos, range: 1 }, { priority: 3 });
    if (creep.transfer(target, RESOURCE_ENERGY) === OK) {
      const amount = Math.min(
        target.store.getFreeCapacity(RESOURCE_ENERGY),
        creep.store.getUsedCapacity(RESOURCE_ENERGY)
      );
      if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof Structure)) {
        // Record deposit amount
        HarvestLedger.record(mission.office, mission.data.withdrawTarget, 'deposit', amount);
        LogisticsLedger.record(mission.office, 'deposit', -amount);
      }
      delete mission.data.depositTarget;
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

  return States.DEPOSIT;
};
