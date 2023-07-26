import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildMarketer = (energy: number): CreepBuild[] => {
  if (energy < 650) {
    return [];
  } else {
    return [unboosted(buildFromSegment(energy, [CLAIM, MOVE], { maxSegments: 5 }))];
  }
};
