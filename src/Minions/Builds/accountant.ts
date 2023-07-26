import { memoize } from 'utils/memoizeFunction';
import { buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildAccountant = memoize(
  // Memoizes at 50-energy increments
  (energy: number, maxSegments = 25, roads = false, repair = false) =>
    `${Math.round((energy * 2) / 100)} ${maxSegments} ${roads}`,
  (energy: number, maxSegments = 25, roads = false, repair = false): CreepBuild[] => {
    const suffix = energy < 350 ? [] : repair ? (roads ? [WORK, CARRY, MOVE] : [WORK, MOVE]) : [];
    if (energy < 100 || maxSegments === 0) {
      return [];
    } else if (energy < 5600) {
      // Before we have two spawns, create smaller haulers
      if (!roads) {
        return [unboosted(buildFromSegment(energy, [CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13), suffix }))];
      } else {
        return [unboosted(
          buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13), suffix })
        )];
      }
    } else {
      if (!roads) {
        return [unboosted(buildFromSegment(energy, [CARRY, MOVE], { maxSegments, suffix }))];
      } else {
        return [unboosted(buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments, suffix }))];
      }
    }
  }
);
