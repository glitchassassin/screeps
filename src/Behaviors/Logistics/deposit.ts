import { BehaviorResult } from 'Behaviors/Behavior';
import { followPathHomeFromSource } from 'Behaviors/followPathHomeFromSource';
import { moveTo } from 'Behaviors/moveTo';
import { States } from 'Behaviors/states';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { Mission, MissionType } from 'Missions/Mission';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { creepCostPerTick } from 'Selectors/minionCostPerTick';
import { renewCost } from 'Selectors/renewCost';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { viz } from 'Selectors/viz';

export const deposit = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.FIND_WITHDRAW;
  mission.efficiency.working += 1;

  if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof StructureStorage)) {
    // Record deposit cost
    HarvestLedger.record(mission.office, mission.data.withdrawTarget, creep.name + ' spawn', -creepCostPerTick(creep));
  }

  let target = byId(mission.data.depositTarget as Id<AnyStoreStructure | Creep>);

  if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
    return States.FIND_DEPOSIT;
  }

  if (mission.data.repair) {
    const road = creep.pos
      .findInRange(FIND_STRUCTURES, 3)
      .find(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax);
    if (road) {
      if (creep.repair(road) === OK) {
        const cost = REPAIR_COST * REPAIR_POWER * 1; // Haulers will only ever have one work part // creep.body.filter(p => p.type === WORK).length;
        if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof StructureStorage)) {
          // Record deposit cost
          HarvestLedger.record(mission.office, mission.data.withdrawTarget, creep.name + ' repair', -cost);
        }
      }
    }
  }

  const nearby = lookNear(creep.pos);

  if (!target || creep.pos.getRangeTo(target) > 1) {
    // Check for nearby targets of opportunity
    let energyRemaining = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    for (const opp of nearby) {
      if (opp.creep?.my) {
        if (
          opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          (((opp.creep.name.startsWith('ENGINEER') || opp.creep.name.startsWith('RESEARCH')) &&
            storageEnergyAvailable(mission.office) >= Game.rooms[mission.office].energyCapacityAvailable) ||
            opp.creep.name.startsWith('REFILL'))
        ) {
          if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
            const amount = Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
            energyRemaining -= amount;
            if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof StructureStorage)) {
              // Record deposit amount
              HarvestLedger.record(mission.office, mission.data.withdrawTarget, creep.name + ' deposit', amount);
            }
            break;
          }
        }
        // else if (
        //   opp.creep.name.startsWith('ACCOUNTANT') &&
        //   opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) >= energyRemaining &&
        //   target &&
        //   opp.creep.pos.getRangeTo(target) < creep.pos.getRangeTo(target)
        // ) {
        //   if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
        //     energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
        //     opp.creep.memory.runState = States.DEPOSIT;
        //     return States.WITHDRAW;
        //   }
        //   break;
        // }
      } else if (
        (opp.structure?.structureType === STRUCTURE_EXTENSION || opp.structure?.structureType === STRUCTURE_SPAWN) &&
        (opp.structure as AnyStoreStructure).store[RESOURCE_ENERGY] <
          (opp.structure as AnyStoreStructure).store.getCapacity(RESOURCE_ENERGY)
      ) {
        if (creep.transfer(opp.structure, RESOURCE_ENERGY) === OK) {
          const amount = Math.min((opp.structure as AnyStoreStructure).store[RESOURCE_ENERGY], energyRemaining);
          energyRemaining -= amount;
          if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof StructureStorage)) {
            // Record deposit amount
            HarvestLedger.record(mission.office, mission.data.withdrawTarget, creep.name + ' deposit', amount);
          }
          break;
        }
      }
    }
    if (energyRemaining === 0) {
      return States.FIND_WITHDRAW;
    }
  }
  if (!target) return States.DEPOSIT;
  if (mission.type === MissionType.MOBILE_REFILL) viz(creep.pos.roomName).line(creep.pos, target.pos);
  // travel home from a source
  if (
    mission.data.withdrawTarget &&
    !(byId(mission.data.withdrawTarget) instanceof StructureStorage) &&
    creep.pos.roomName !== mission.office
  ) {
    followPathHomeFromSource(creep, mission.office, mission.data.withdrawTarget);
  } else if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
    if (creep.transfer(target, RESOURCE_ENERGY) === OK) {
      const amount = Math.min(target.store[RESOURCE_ENERGY], creep.store.getUsedCapacity(RESOURCE_ENERGY));
      if (mission.data.withdrawTarget && !(byId(mission.data.withdrawTarget) instanceof StructureStorage)) {
        // Record deposit amount
        HarvestLedger.record(mission.office, mission.data.withdrawTarget, creep.name + ' deposit', amount);
      }
      delete mission.data.depositTarget;
    }
    // If target is spawn, is not spawning, and is at capacity, renew this creep
    if (
      target instanceof StructureSpawn &&
      !target.spawning &&
      target.store.getUsedCapacity(RESOURCE_ENERGY) + creep.store.getUsedCapacity(RESOURCE_ENERGY)
    ) {
      if (target.renewCreep(creep) === OK) {
        mission.actual.energy += renewCost(creep);
      }
    }
  }

  return States.DEPOSIT;
};
