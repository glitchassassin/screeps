import { BehaviorResult } from 'Behaviors/Behavior';
import { moveTo } from 'Behaviors/moveTo';
import { States } from 'Behaviors/states';
import { Mission, MissionType } from 'Missions/Mission';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { renewCost } from 'Selectors/renewCost';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { viz } from 'Selectors/viz';

export const deposit = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.FIND_WITHDRAW;
  mission.efficiency.working += 1;

  let target = byId(mission.data.depositTarget as Id<AnyStoreStructure | Creep>);

  if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
    return States.FIND_DEPOSIT;
  }

  if (mission.data.repair) {
    const road = creep.pos
      .findInRange(FIND_STRUCTURES, 3)
      .find(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax);
    if (road) creep.repair(road);
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
          creep.transfer(opp.creep, RESOURCE_ENERGY);
          energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
          break;
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
        creep.transfer(opp.structure, RESOURCE_ENERGY);
        energyRemaining -= Math.min((opp.structure as AnyStoreStructure).store[RESOURCE_ENERGY], energyRemaining);
        break;
      }
    }
    if (energyRemaining === 0) {
      return States.FIND_WITHDRAW;
    }
  }
  if (!target) return States.DEPOSIT;
  if (mission.type === MissionType.MOBILE_REFILL) viz(creep.pos.roomName).line(creep.pos, target.pos);
  if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
    if (creep.transfer(target, RESOURCE_ENERGY) === OK) {
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
