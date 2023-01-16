import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildSalesman = (energy: number, link = false, remote = false): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else if (energy < 550) {
    return unboosted([WORK, WORK, MOVE]);
  } else if (energy === 550) {
    return link || remote
      ? unboosted([WORK, WORK, WORK, CARRY, MOVE])
      : unboosted([WORK, WORK, WORK, WORK, WORK, MOVE]);
  }

  if (remote) {
    return unboosted(buildFromSegment(energy, [WORK, WORK, WORK, MOVE], { maxSegments: 2, suffix: [CARRY] }));
  } else {
    return unboosted(
      buildFromSegment(energy, [WORK, WORK, WORK, WORK, WORK, MOVE], {
        maxSegments: 2,
        suffix: link ? [CARRY] : []
      })
    );
  }
};
