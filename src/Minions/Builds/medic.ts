import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildMedic = (energy: number): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else {
    return [unboosted(buildFromSegment(energy, [HEAL, MOVE], { sorted: true }))];
  }
};
