import { assignedLogisticsCapacity, findBestDepositTarget } from 'Behaviors/Logistics';
import { States } from 'Behaviors/states';
import { Mission, MissionType } from 'Missions/Mission';
import { bucketBrigadeDeposit } from './bucketBrigade';

export const findDeposit = (mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>, creep: Creep) => {
  delete mission.data.depositTarget;

  if (bucketBrigadeDeposit(creep, mission)) {
    return States.FIND_WITHDRAW;
  }

  const { depositAssignments } = assignedLogisticsCapacity(mission.office);
  const bestTarget = findBestDepositTarget(mission.office, creep, mission.type === MissionType.MOBILE_REFILL);
  if (bestTarget) {
    creep.room.visual.line(creep.pos, bestTarget[1].pos, { color: 'red' });
    depositAssignments.set(bestTarget, (depositAssignments.get(bestTarget) ?? 0) + creep.store[RESOURCE_ENERGY]);
    mission.data.depositTarget = bestTarget[1].id;
  }
  if (mission.data.depositTarget) return States.DEPOSIT;
  if (!creep.store[RESOURCE_ENERGY]) return States.FIND_WITHDRAW;
  creep.say('Idle');
  return States.FIND_DEPOSIT;
};
