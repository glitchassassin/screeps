import { MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';
import { franchiseEnergyAvailable } from 'Selectors/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/franchisesByOffice';
import { getFranchiseDistance } from 'Selectors/getFranchiseDistance';
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
      if (mission.data.withdrawTarget && withdrawAssignments.has(mission.data.withdrawTarget as Id<Source>)) {
        withdrawAssignments.set(
          mission.data.withdrawTarget as Id<Source>,
          (withdrawAssignments.get(mission.data.withdrawTarget as Id<Source>) ?? 0) + mission.data.capacity
        );
      }
      if (mission.data.depositTarget && depositAssignmentIds.has(mission.data.depositTarget)) {
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
  const maxDistance = (creep.ticksToLive ?? CREEP_LIFE_TIME) * 0.5;
  let bestTarget = undefined;
  let bestAmount = -Infinity;
  let bestPriority = 0;
  let bestDistance = Infinity;
  for (const [prioritizedStructure, capacity] of depositAssignments) {
    const [priority, target] = prioritizedStructure;
    if (target instanceof StructureStorage && ignoreStorage) continue;
    const amount = (target.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) - capacity;
    const distance = getRangeTo(creep.pos, target.pos);
    if (distance > maxDistance) continue; // too far for this creep to survive
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

export function findBestWithdrawTarget(office: string, creep: Creep) {
  const { withdrawAssignments } = assignedLogisticsCapacity(office);
  const maxDistance = (creep.ticksToLive ?? CREEP_LIFE_TIME) * 0.5;
  let bestTarget = undefined;
  let bestAmount = 0;
  let bestDistance = Infinity;
  for (const [source, capacity] of withdrawAssignments) {
    const amount = franchiseEnergyAvailable(source) - capacity;
    const distance = getFranchiseDistance(office, source) ?? Infinity;
    if (distance * 2 > maxDistance) continue; // too far for this creep to survive
    if (
      (distance < bestDistance && amount >= Math.min(bestAmount, creep.store.getFreeCapacity(RESOURCE_ENERGY))) ||
      (amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))
    ) {
      bestTarget = source;
      bestAmount = amount;
      bestDistance = distance;
    }
  }
  return bestTarget;
}
