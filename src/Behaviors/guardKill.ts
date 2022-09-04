import { moveTo } from 'screeps-cartographer';

export const guardKill = (creep: Creep, target?: Creep | Structure) => {
  if (target) {
    moveTo(creep, { pos: target.pos, range: 1 });
    return creep.attack(target) === OK;
  }
  return false;
};
