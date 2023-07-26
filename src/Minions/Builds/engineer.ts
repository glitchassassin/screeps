import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildEngineer = (energy: number, roads = false, near = false): CreepBuild[] => {
  if (near) {
    if (roads) {
      return [unboosted(buildFromSegment(energy, [WORK, MOVE, CARRY, CARRY]))];
    } else {
      return [unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY]))];
    }
  } else {
    if (roads) {
      if (energy <= 500) return [unboosted(buildFromSegment(energy, [WORK, MOVE, CARRY, CARRY]))];
      return [unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]))];
    } else {
      if (energy <= 550) return [unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY]))];
      if (energy <= 1800)
        return [unboosted(
          buildFromSegment(energy, [WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY])
        )];
      // prettier-ignore
      return [unboosted([
        WORK, WORK, WORK,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY
      ])]
    }
  }
};
