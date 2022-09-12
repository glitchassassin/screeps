import { States } from 'Behaviors/states';
import { Mission, MissionType } from 'Missions/Mission';
import { roomPlans } from 'Selectors/roomPlans';
import { bucketBrigadeWithdraw } from './bucketBrigade';

export const withdrawFromStorage = (
  mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>,
  creep: Creep
) => {
  delete mission.data.withdrawTarget;

  if (bucketBrigadeWithdraw(creep, mission)) {
    return States.FIND_DEPOSIT;
  }

  // Get energy from a franchise
  const storage = roomPlans(mission.office)?.headquarters?.storage.structure;

  if (!storage || (creep.ticksToLive && creep.ticksToLive < 50)) {
    // no work within range and creep is dying
    return States.RECYCLE;
  }

  mission.data.withdrawTarget = storage.id;

  if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.FIND_DEPOSIT;

  return States.WITHDRAW;
};
