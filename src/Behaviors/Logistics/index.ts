import { States } from 'Behaviors/states';
import { MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { storageStructureThatNeedsEnergy } from 'Selectors/storageStructureThatNeedsEnergy';
import { memoizeByTick } from 'utils/memoizeFunction';

export const assignedLogisticsCapacity = memoizeByTick(
  office => office,
  (office: string) => {
    const withdrawAssignments = new Map<Id<Source>, number>();
    const depositAssignments = new Map<[number, AnyStoreStructure | Creep], number>();
    const depositAssignmentIds = new Map<Id<AnyStoreStructure | Creep>, [number, AnyStoreStructure | Creep]>();

    for (const { source } of franchisesByOffice(office)) {
      withdrawAssignments.set(source, 0);
    }
    for (const prioritizedStructure of storageStructureThatNeedsEnergy(office)) {
      depositAssignments.set(prioritizedStructure, 0);
      depositAssignmentIds.set(prioritizedStructure[1].id, prioritizedStructure);
    }

    for (const mission of activeMissions(office).filter(isMission(MissionType.LOGISTICS))) {
      if (
        assignedCreep(mission)?.memory.runState === States.WITHDRAW &&
        mission.data.withdrawTarget &&
        withdrawAssignments.has(mission.data.withdrawTarget as Id<Source>)
      ) {
        withdrawAssignments.set(
          mission.data.withdrawTarget as Id<Source>,
          (withdrawAssignments.get(mission.data.withdrawTarget as Id<Source>) ?? 0) + mission.data.capacity
        );
      }
      if (
        assignedCreep(mission)?.memory.runState === States.DEPOSIT &&
        mission.data.depositTarget &&
        depositAssignmentIds.has(mission.data.depositTarget)
      ) {
        const target = depositAssignmentIds.get(mission.data.depositTarget);
        if (!target) continue;
        depositAssignments.set(
          target,
          Math.min(
            target[1].store.getFreeCapacity(RESOURCE_ENERGY),
            (depositAssignments.get(target) ?? 0) + (assignedCreep(mission)?.store[RESOURCE_ENERGY] ?? 0)
          )
        );
      }
    }

    return { withdrawAssignments, depositAssignments };
  }
);

export function findBestDepositTarget(office: string, creep: Creep, ignoreStorage = false) {
  const { depositAssignments } = assignedLogisticsCapacity(office);
  let bestTarget = undefined;
  let bestAmount = -Infinity;
  let bestPriority = 0;
  let bestDistance = Infinity;
  for (const [prioritizedStructure, capacity] of depositAssignments) {
    const [priority, target] = prioritizedStructure;
    if (target instanceof StructureStorage && ignoreStorage) continue;
    const amount = (target.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) - capacity;
    const distance = getRangeTo(creep.pos, target.pos);
    if (
      priority > bestPriority ||
      (priority === bestPriority &&
        distance < bestDistance &&
        amount >= Math.min(bestAmount, creep.store.getFreeCapacity(RESOURCE_ENERGY))) ||
      (priority === bestPriority && amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))
    ) {
      bestTarget = prioritizedStructure;
      bestAmount = amount;
      bestDistance = distance;
      bestPriority = priority;
    }
  }
  return bestTarget;
}

/**
 * Best withdraw target is the one this creep can get the most from, or (in case of a tie)
 * the one with the largest stockpile
 */
export function findBestWithdrawTarget(office: string, creep: Creep) {
  const { withdrawAssignments } = assignedLogisticsCapacity(office);
  const maxDistance = (creep.ticksToLive ?? CREEP_LIFE_TIME) * 0.8;
  let bestTarget = undefined;
  let bestCreepAmount = 0;
  let bestTotalAmount = 0;
  let bestDistance = Infinity;
  for (const [source, capacity] of withdrawAssignments) {
    // total stockpile at the source
    const totalAmount = franchiseEnergyAvailable(source);
    // total this creep can get (after reservations)
    const creepAmount = Math.min(totalAmount - capacity, creep.store.getFreeCapacity(RESOURCE_ENERGY));
    if (creepAmount === 0) continue;

    const distance = getFranchiseDistance(office, source) ?? Infinity;
    if (distance * 2 > maxDistance) continue; // too far for this creep to survive
    if (creepAmount > bestCreepAmount || (creepAmount === bestCreepAmount && distance < bestDistance)) {
      bestTarget = source;
      bestCreepAmount = creepAmount;
      bestTotalAmount = totalAmount;
      bestDistance = distance;
    }
  }
  return bestTarget;
}
