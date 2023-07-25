import { BOOSTS_BY_INTENT } from 'gameConstants';
import { buildCost } from 'Selectors/minionCostPerTick';
import { buildFromSegment, CreepBuild } from './utils';

export const buildDismantler = (energy: number, maxTier: 0 | 1 | 2 | 3 = 3): CreepBuild[] => {
  const tiers = [3, 2, 1, 0].filter(tier => tier <= maxTier);
  if (energy < 150) {
    return [];
  } else {
    // Maintain 1-1 WORK-MOVE ratio
    const body = buildFromSegment(energy, [WORK, MOVE]);
    const count = body.filter(p => p === WORK).length;
    // boost, when available
    return tiers.map(tier => {
      const boosts = tier > 0 ? [{ type: BOOSTS_BY_INTENT.DISMANTLE[tier - 1], count }] : [];
      return {
        body,
        boosts,
        tier,
        cost: buildCost(body, boosts)
      };
    });
  }
};
