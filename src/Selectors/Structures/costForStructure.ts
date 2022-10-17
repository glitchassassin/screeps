import { BARRIER_LEVEL, BARRIER_TYPES, REPAIR_THRESHOLD } from 'config';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { roomPlans } from 'Selectors/roomPlans';

export const costForPlannedStructure = (structure: PlannedStructure, office: string) => {
  const cost = {
    efficiency: 0,
    cost: 0
  };

  const distance = getRangeTo(
    roomPlans(office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office),
    structure.pos
  );

  // Calculation assumes Engineers have equal WORK and CARRY and can move 1 sq/tick (generally true with roads)
  if (structure.structure) {
    const workTime = CARRY_CAPACITY / (REPAIR_COST * REPAIR_POWER);
    cost.efficiency = workTime / (workTime + distance * 2);
    const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
    const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
    if (structure.structure.hits > maxHits * REPAIR_THRESHOLD) {
      return cost;
    }
    const repairNeeded = maxHits - structure.structure.hits;
    cost.cost = repairNeeded * REPAIR_COST;
  } else if (structure.constructionSite) {
    // Structure needs to be finished
    const workTime = CARRY_CAPACITY / BUILD_POWER;
    cost.efficiency = workTime / (workTime + distance * 2);
    cost.cost = structure.constructionSite.progressTotal - structure.constructionSite.progress;
  } else {
    if (
      !(
        (Memory.rooms[structure.pos.roomName].owner &&
          Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
        (Memory.rooms[structure.pos.roomName].reserver &&
          Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether')
      )
    ) {
      // Structure needs to be built
      const workTime = CARRY_CAPACITY / BUILD_POWER;
      cost.efficiency = workTime / (workTime + distance * 2);
      cost.cost = CONSTRUCTION_COST[structure.structureType];
    } else {
      // Hostile territory, cannot build
      return cost;
    }
  }

  return cost;
};

export const adjustedEnergyForPlannedStructure = (
  structure: PlannedStructure,
  distance: number,
  threshold = REPAIR_THRESHOLD
) => {
  // Calculation assumes Engineers have equal WORK and CARRY and can move 1 sq/tick (generally true with roads)
  if (structure.structure) {
    const workTime = CARRY_CAPACITY / (REPAIR_COST * REPAIR_POWER);
    const efficiency = workTime / (workTime + distance * 2);
    const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
    const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
    if (structure.structure.hits > maxHits * threshold) {
      return 0;
    }
    const repairNeeded = maxHits - structure.structure.hits;
    return (repairNeeded * REPAIR_COST) / efficiency;
  } else if (structure.constructionSite) {
    // Structure needs to be finished
    const workTime = CARRY_CAPACITY / BUILD_POWER;
    const efficiency = workTime / (workTime + distance * 2);
    return (structure.constructionSite.progressTotal - structure.constructionSite.progress) / efficiency;
  } else {
    if (
      !(
        (Memory.rooms[structure.pos.roomName].owner &&
          Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
        (Memory.rooms[structure.pos.roomName].reserver &&
          Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether')
      )
    ) {
      // Structure needs to be built
      const workTime = CARRY_CAPACITY / BUILD_POWER;
      const efficiency = workTime / (workTime + distance * 2);
      return CONSTRUCTION_COST[structure.structureType] / efficiency;
    } else {
      // Hostile territory, cannot build
      return 0;
    }
  }
};
