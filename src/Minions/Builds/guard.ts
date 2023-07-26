import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildGuard = (energy: number, heal = false): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else if (heal && energy >= 420) {
    // Add a heal part
    return [unboosted(buildFromSegment(energy, [ATTACK, MOVE], { sorted: true, suffix: [HEAL, MOVE] }))];
  } else {
    return [unboosted(buildFromSegment(energy, [ATTACK, MOVE], { sorted: true }))];
  }
};
