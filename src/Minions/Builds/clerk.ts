import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildClerk = (energy: number, maxSegments = 50, mobile = false): CreepBuild[] => {
  return unboosted(buildFromSegment(energy, [CARRY], { maxSegments, suffix: mobile ? [MOVE] : [] }));
};
