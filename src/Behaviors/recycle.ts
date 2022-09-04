import { Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import { States } from './states';

export const recycle = (mission: Mission<MissionType>, creep: Creep) => {
  const recycleTarget = roomPlans(mission.office)?.fastfiller?.containers[0].pos;
  const recycleSpawn = roomPlans(mission.office)?.fastfiller?.spawns[0].structure as StructureSpawn | undefined;
  if (!recycleTarget || !recycleSpawn) {
    // oh well, we tried
    creep.suicide();
    return States.RECYCLE;
  }
  moveTo(creep, { pos: recycleTarget, range: 0 });
  recycleSpawn.recycleCreep(creep);
  return States.RECYCLE;
};
