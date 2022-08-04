import { assignedLogisticsCapacity, findBestWithdrawTarget } from 'Behaviors/Logistics';
import { States } from 'Behaviors/states';
import { Mission, MissionType } from 'Missions/Mission';

export const findWithdraw = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  delete mission.data.withdrawTarget;
  // Get energy from a franchise
  const { withdrawAssignments } = assignedLogisticsCapacity(mission.office);
  const bestTarget = findBestWithdrawTarget(mission.office, creep);

  if (bestTarget) {
    withdrawAssignments.set(bestTarget, (withdrawAssignments.get(bestTarget) ?? 0) + mission.data.capacity);
    mission.data.withdrawTarget = bestTarget;
  } else if (creep.ticksToLive && creep.ticksToLive < 100) {
    // no work within range and creep is dying
    console.log('Sending', creep.name, 'to recycle instead of withdraw', creep.pos, creep.ticksToLive);
    return States.RECYCLE;
  }
  if (mission.data.withdrawTarget) return States.WITHDRAW;
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.FIND_DEPOSIT;
  creep.say('Idle');
  return States.FIND_WITHDRAW;
};
