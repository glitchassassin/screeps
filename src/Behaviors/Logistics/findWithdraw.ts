import { assignedLogisticsCapacity, findBestWithdrawTarget } from 'Behaviors/Logistics';
import { States } from 'Behaviors/states';
import { Mission, MissionType } from 'Missions/Mission';
import { posById } from 'Selectors/posById';
import { bucketBrigadeWithdraw } from './bucketBrigade';

export const findWithdraw = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  delete mission.data.withdrawTarget;

  if (bucketBrigadeWithdraw(creep, mission)) {
    return States.FIND_DEPOSIT;
  }

  // Get energy from a franchise
  const { withdrawAssignments } = assignedLogisticsCapacity(mission.office);
  const bestTarget = findBestWithdrawTarget(mission.office, creep);

  if (bestTarget) {
    if (posById(bestTarget)) creep.room.visual.line(creep.pos, posById(bestTarget)!, { color: 'green' });
    withdrawAssignments.set(bestTarget, (withdrawAssignments.get(bestTarget) ?? 0) + mission.data.capacity);
    mission.data.withdrawTarget = bestTarget;
  } else if (creep.ticksToLive && creep.ticksToLive < 100) {
    // no work within range and creep is dying
    return States.RECYCLE;
  }
  if (mission.data.withdrawTarget) return States.WITHDRAW;
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.FIND_DEPOSIT;
  creep.say('Idle');
  return States.FIND_WITHDRAW;
};
