import { FRANCHISE_EVALUATE_PERIOD } from 'config';
import { posById } from 'Selectors/posById';
import { memoizeByTick } from 'utils/memoizeFunction';

export const franchiseDisabled = memoizeByTick(
  (office: string, source: Id<Source>) => office + source,
  (office, source) => {
    const pos = posById(source);
    if (!pos) return true;
    const { scores } = Memory.rooms[pos.roomName].franchises[office][source];
    if (scores.length === FRANCHISE_EVALUATE_PERIOD && scores.reduce((a, b) => a + b, 0) / scores.length < 0.5) {
      // franchise is too expensive
      return true;
    }
    return false;
  }
);
