import { States } from 'Behaviors/states';
import { LogisticsMission } from 'Missions/Implementations/Logistics';
import { MobileRefillMission } from 'Missions/Implementations/MobileRefill';
import { Mission, MissionType } from 'Missions/Mission';
import { assignedMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { posById } from 'Selectors/posById';
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
  const mission = assignedMission(from) as LogisticsMission | MobileRefillMission;
  const target = byId(mission?.data.depositTarget as Id<AnyStoreStructure | Creep>);
  // no deposit target in mind
  if (!target) return false;
  // no distance advantage to be had
  if (from.pos.getRangeTo(target) <= to.pos.getRangeTo(target)) return false;
  return true;
};

export const bucketBrigadeWithdraw = (
  creep: Creep,
  mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>
) => {
  if (hasBrigaded().has(creep)) return false;
  const log = new Map<Creep, string>();
  brigadeLog().set(creep, log);
  // Bucket brigade
  const opp = lookNear(creep.pos).find(r => {
    if (r.creep) {
      const m = assignedMission(r.creep) as LogisticsMission | MobileRefillMission;
      const target = byId(m?.data.depositTarget as Id<AnyStoreStructure | Creep>);
      log.set(
        r.creep,
        `[${r.creep.name}]: ${!hasBrigaded().has(r.creep)} ${
          creep.store.getFreeCapacity(RESOURCE_ENERGY) >= r.creep.store.getUsedCapacity(RESOURCE_ENERGY)
        } ${!!target} ${target && r.creep?.pos.getRangeTo(target) > creep.pos.getRangeTo(target)}`
      );
    }
    return shouldBucketBrigadeWithdraw(r.creep, creep);
  });
  if (opp?.creep && opp.creep.transfer(creep, RESOURCE_ENERGY) === OK) {
    creep.store[RESOURCE_ENERGY] += opp.creep.store[RESOURCE_ENERGY];
    console.log(
      creep.name,
      '<- bucket handoff <-',
      opp.creep.name,
      assignedMission(opp.creep)?.data.lastRan === Game.time
    );
    opp.creep.memory.runState = States.WITHDRAW;
    const oppMission = assignedMission(opp.creep);
    if (oppMission) {
      console.log('reassigning', creep.name, 'to', oppMission.data.depositTarget);
      mission.data.depositTarget = oppMission.data.depositTarget;
      delete oppMission.data.depositTarget;
    }
    delete mission.data.withdrawTarget;
    hasBrigaded().add(creep);
    hasBrigaded().add(opp.creep);
    return true;
  }
  return false;
};

export const bucketBrigadeDeposit = (
  creep: Creep,
  mission: Mission<MissionType.LOGISTICS | MissionType.MOBILE_REFILL>
) => {
  if (hasBrigaded().has(creep)) return false;
  const target = byId(mission.data.depositTarget as Id<AnyStoreStructure | Creep>);
  if (!target) return false;
  const opp = lookNear(creep.pos).find(r => shouldBucketBrigadeWithdraw(creep, r.creep));
  if (opp?.creep) {
    if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
      opp.creep.store[RESOURCE_ENERGY] += creep.store[RESOURCE_ENERGY];
      opp.creep.memory.runState = States.DEPOSIT;
      console.log(
        creep.name,
        '-> bucket handoff ->',
        opp.creep.name,
        assignedMission(opp.creep)?.data.lastRan === Game.time
      );
      if (assignedMission(opp.creep)?.data.lastRan === Game.time) {
        console.log("Why didn't", opp.creep.name, 'withdraw from', creep.name, '?');
        console.log('hasBrigaded', !hasBrigaded().has(opp.creep), !hasBrigaded().has(creep));
        console.log('creepName', opp.creep.name.startsWith('ACCOUNTANT'), creep.name.startsWith('ACCOUNTANT'));
        console.log(
          'capacity',
          opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)
        );
        const target =
          byId(mission.data.depositTarget as Id<_HasId & _HasRoomPosition>)?.pos ?? posById(mission.data.depositTarget);
        console.log('hasTarget', target);
        if (target) console.log('closerToTarget', creep.pos.getRangeTo(target) > opp.creep.pos.getRangeTo(target));
        console.log('brigadeLog:', brigadeLog().get(opp.creep)?.get(creep));
      }
      const oppMission = assignedMission(opp.creep);
      if (oppMission) {
        console.log('reassigning', opp.creep.name, 'to', mission.data.depositTarget);
        oppMission.data.depositTarget = mission.data.depositTarget;
        delete oppMission.data.withdrawTarget;
      }
      delete mission.data.depositTarget;
      hasBrigaded().add(creep);
      hasBrigaded().add(opp.creep);
      return true;
    }
  }
  return false;
};
