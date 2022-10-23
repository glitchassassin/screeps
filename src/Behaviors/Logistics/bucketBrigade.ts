import { States } from 'Behaviors/states';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { assignedMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { memoizeByTick } from 'utils/memoizeFunction';

// return fresh instance of the set each tick
const hasBrigaded = memoizeByTick(
  () => 'map',
  () => new Set<Creep>()
);

const brigadeLog = memoizeByTick(
  () => 'map',
  () => new Map<Creep, Map<Creep, string>>()
);

const shouldBucketBrigadeWithdraw = (from?: Creep, to?: Creep) => {
  if (!from?.name.startsWith('ACCOUNTANT') || !to?.name.startsWith('ACCOUNTANT')) return false;
  // already bucket brigaded this tick
  if (hasBrigaded().has(from) || hasBrigaded().has(to)) return false;
  // cannot transfer all energy
  if (from.store.getUsedCapacity(RESOURCE_ENERGY) > to.store.getFreeCapacity(RESOURCE_ENERGY)) return false;
  const mission = assignedMission(from);
  if (!(mission instanceof LogisticsMission)) return false;
  const target = byId(mission?.missionData.depositTarget as Id<AnyStoreStructure | Creep>);
  // no deposit target in mind
  if (!target) return false;
  // no distance advantage to be had
  if (from.pos.getRangeTo(target) <= to.pos.getRangeTo(target)) return false;
  return true;
};

export const bucketBrigadeWithdraw = (
  creep: Creep,
  data: {
    office: string;
    withdrawTarget?: Id<Source>;
    depositTarget?: Id<AnyStoreStructure | Creep>;
  }
) => {
  if (hasBrigaded().has(creep)) return false;
  const log = new Map<Creep, string>();
  brigadeLog().set(creep, log);
  // Bucket brigade
  const opp = lookNear(creep.pos).find(r => {
    return shouldBucketBrigadeWithdraw(r.creep, creep);
  });
  if (opp?.creep && opp.creep.transfer(creep, RESOURCE_ENERGY) === OK) {
    creep.store[RESOURCE_ENERGY] += opp.creep.store[RESOURCE_ENERGY];
    opp.creep.memory.runState = States.WITHDRAW;
    const oppMission = assignedMission(opp.creep);
    if (oppMission instanceof LogisticsMission) {
      data.depositTarget = oppMission.missionData.depositTarget;
      data.withdrawTarget = oppMission.missionData.withdrawTarget;
      delete oppMission.missionData.depositTarget;
      delete oppMission.missionData.withdrawTarget;
    }
    hasBrigaded().add(creep);
    hasBrigaded().add(opp.creep);
    return true;
  }
  return false;
};

export const bucketBrigadeDeposit = (
  creep: Creep,
  data: {
    office: string;
    withdrawTarget?: Id<Source>;
    depositTarget?: Id<AnyStoreStructure | Creep>;
  }
) => {
  if (hasBrigaded().has(creep)) return false;
  const target = byId(data.depositTarget as Id<AnyStoreStructure | Creep>);
  if (!target) return false;
  const opp = lookNear(creep.pos).find(r => shouldBucketBrigadeWithdraw(creep, r.creep));
  if (opp?.creep?.my) {
    if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
      opp.creep.store[RESOURCE_ENERGY] += creep.store[RESOURCE_ENERGY];
      opp.creep.memory.runState = States.DEPOSIT;
      const oppMission = assignedMission(opp.creep);
      if (oppMission instanceof LogisticsMission) {
        // console.log('reassigning', opp.creep.name, 'to', mission.data.depositTarget);
        oppMission.missionData.depositTarget = data.depositTarget;
        oppMission.missionData.withdrawTarget = data.withdrawTarget;
      }
      delete data.depositTarget;
      delete data.withdrawTarget;
      hasBrigaded().add(creep);
      hasBrigaded().add(opp.creep);
      return true;
    }
  }
  return false;
};
