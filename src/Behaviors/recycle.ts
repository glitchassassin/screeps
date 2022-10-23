import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import { States } from './states';

export const recycle = (
  data: {
    office: string;
  },
  creep: Creep
) => {
  const recycleTarget = roomPlans(data.office)?.fastfiller?.containers[0].pos;
  const recycleSpawn = roomPlans(data.office)?.fastfiller?.spawns[0].structure as StructureSpawn | undefined;
  if (!recycleTarget || !recycleSpawn) {
    // oh well, we tried
    creep.suicide();
    return States.RECYCLE;
  }
  moveTo(creep, { pos: recycleTarget, range: 0 });
  recycleSpawn.recycleCreep(creep);
  return States.RECYCLE;
};
