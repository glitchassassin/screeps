import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildBlinky = (energy: number): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else if (energy < 1000) {
    return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true }));
  } else {
    return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true }));
  }
};

export const buildBlinkyWithBoosts = (energy: number): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else if (energy < 1000) {
    return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true }));
  } else {
    return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true }));
  }
};
