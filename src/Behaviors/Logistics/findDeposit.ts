import { assignedLogisticsCapacity, findBestDepositTarget } from 'Behaviors/Logistics';
import { States } from 'Behaviors/states';
import { Mission, MissionType } from 'Missions/Mission';

export const findDeposit = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  delete mission.data.depositTarget;
  // Get energy from a franchise
  const { depositAssignments } = assignedLogisticsCapacity(mission.office);
  const bestTarget = findBestDepositTarget(mission.office, creep, mission.type === MissionType.MOBILE_REFILL);
  if (bestTarget) {
    depositAssignments.set(bestTarget, (depositAssignments.get(bestTarget) ?? 0) + creep.store[RESOURCE_ENERGY]);
    mission.data.depositTarget = bestTarget[1].id;
  } else if (creep.ticksToLive && creep.ticksToLive < 100) {
    // no work within range and creep is dying
    return States.RECYCLE;
  }
  if (mission.data.depositTarget) return States.DEPOSIT;
  if (!creep.store[RESOURCE_ENERGY]) return States.FIND_WITHDRAW;
  creep.say('Idle');
  return States.FIND_DEPOSIT;
};
