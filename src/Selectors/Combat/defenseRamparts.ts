import { BARRIER_LEVEL } from 'config';
import { findHostileCreeps, findHostileCreepsInRange } from 'Selectors/findHostileCreeps';
import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';
import { repairThreshold } from 'Selectors/Structures/repairThreshold';
import { memoizeByTick } from 'utils/memoizeFunction';

/**
 * Return the ramparts that are close to an enemy
 */
export const rampartsToDefend = memoizeByTick(
  room => room,
  (room: string) => {
    if (!findHostileCreeps(room).length) return [];
    const ramparts = roomPlans(room)?.perimeter?.ramparts ?? [];
    if (ramparts.length === 0) return [];
    return ramparts.filter(r => r.structure && findHostileCreepsInRange(r.pos, 5).length);
  }
);

/**
 * True if ramparts have lost containment
 */
export const rampartsAreBroken = memoizeByTick(
  room => room,
  (room: string) => {
    return Boolean(roomPlans(room)?.perimeter?.ramparts.some(r => !r.structure));
  }
);

/**
 * Returns ramparts in need of repair, in priority order
 */
export const rampartsToRepair = memoizeByTick(
  room => room,
  (room: string) => {
    const ramparts = roomPlans(room)?.perimeter?.ramparts ?? [];
    return ramparts
      .filter(r => !r.structure || BARRIER_LEVEL[rcl(room)] * repairThreshold(r) > r.structure.hits)
      .sort((a, b) => (a.structure?.hits ?? 0) - (b.structure?.hits ?? 0));
  }
);
