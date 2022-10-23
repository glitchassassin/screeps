// Maintain authoritative list of deposit targets (storageStructureThatNeedsEnergy)
// and withdraw targets (franchises, getEnergyFromStorage)
// LOGISTICS may withdraw from franchises and deposit to storageStructureThatNeedsEnergy
// MOBILE_REFILL may withdraw from storage or fastfiller and deposit to anything else

import { findBestDepositTarget, findBestWithdrawTarget } from 'Behaviors/Logistics';
import { States } from 'Behaviors/states';
import { MissionType } from 'Missions/Mission';
import { LogisticsMission } from 'Missions/OldImplementations/Logistics';
import { MobileRefillMission } from 'Missions/OldImplementations/MobileRefill';
import { activeMissions, assignedCreep, isMission, or } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { posById } from 'Selectors/posById';

export function updateLogisticsTargets() {
  for (const office in Memory.offices) {
    for (const mission of activeMissions(office).filter(
      or(isMission(MissionType.LOGISTICS), isMission(MissionType.MOBILE_REFILL))
    ) as (LogisticsMission | MobileRefillMission)[]) {
      validateLogisticsTarget(mission);
      selectLogisticsTarget(mission);
    }
  }
}

/**
 * Add logistics targets, if needed
 */
function selectLogisticsTarget(mission: LogisticsMission | MobileRefillMission) {
  const creep = assignedCreep(mission);
  if (creep?.memory.runState === States.DEPOSIT && !mission.data.depositTarget) {
    mission.data.depositTarget = findBestDepositTarget(
      mission.office,
      creep,
      mission.type === MissionType.MOBILE_REFILL,
      true
    )?.[1].id;
  } else if (
    creep?.memory.runState === States.WITHDRAW &&
    mission.type === MissionType.LOGISTICS &&
    !mission.data.withdrawTarget
  ) {
    mission.data.withdrawTarget = findBestWithdrawTarget(mission.office, creep, true);
  }
}

/**
 * Clean up no-longer-valid targets
 */
function validateLogisticsTarget(mission: LogisticsMission | MobileRefillMission) {
  const creep = assignedCreep(mission);
  if (creep?.memory.runState === States.DEPOSIT && mission.data.depositTarget) {
    const target = byId(mission.data.depositTarget as Id<AnyStoreStructure | Creep>);

    if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
      delete mission.data.depositTarget;
    }
  } else if (
    creep?.memory.runState === States.WITHDRAW &&
    'withdrawTarget' in mission.data &&
    mission.data.withdrawTarget
  ) {
    const target = byId(mission.data.withdrawTarget as Id<Source | StructureStorage | StructureContainer>);
    const pos = posById(mission.data.withdrawTarget) ?? target?.pos;
    if (target instanceof StructureStorage || target instanceof StructureContainer) {
      if (target.store[RESOURCE_ENERGY] < 0) {
        // withdraw target is empty
        delete mission.data.withdrawTarget;
      }
    } else if (franchiseEnergyAvailable(mission.data.withdrawTarget) <= 50) {
      delete mission.data.withdrawTarget;
    }
  }
}
