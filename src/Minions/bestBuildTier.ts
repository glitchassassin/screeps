import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
import { CreepBuild } from './Builds/utils';

/**
 * Given a list of minions, each of which is a list of CreepBuilds, pick the
 * tier of boosts that is available for all minions and has the cheapest cost.
 */
export function bestBuildTier(office: string, minions: CreepBuild[][]): number | undefined {
  // lists every tier that is available for all minions
  const tiers = minions[0].map(m => m.tier).filter(t => minions.every(m => m.some(b => b.tier === t)));
  if (tiers.length === 0) {
    return undefined;
  }

  // collect minions by tier
  const minionsByTier = tiers.reduce((byTier, t) => {
    byTier[t] = minions.map(m => m.find(b => b.tier === t)!);
    return byTier;
  }, {} as Record<number, CreepBuild[]>);

  // check if boosts are available for each tier
  const availableTiers = tiers.filter(t => {
    const boostsNeeded = minionsByTier[t]
      .flatMap(m => m.boosts)
      .reduce((needed, b) => {
        needed[b.type] ??= 0;
        needed[b.type] += b.count;
        return needed;
      }, {} as Record<MineralBoostConstant, number>);
    return Object.entries(boostsNeeded).every(
      ([type, count]) => boostsAvailable(office, type as MineralBoostConstant, true) >= count * LAB_BOOST_MINERAL
    );
  });

  // find the cheapest tier
  return availableTiers.reduce(
    (best, t) => {
      const cost = minions.reduce((sum, m) => sum + m.find(b => b.tier === t)!.cost, 0);
      return cost < best.cost ? { tier: t, cost } : best;
    },
    { tier: 0, cost: Infinity }
  ).tier;
}

/**
 * Returns the build with the highest tier that has available boosts
 */
export function bestTierAvailable(office: string, builds: CreepBuild[]): CreepBuild[] {
  const bestBuild = builds.reduce((best, build) => {
    const boostsNeeded = build.boosts.reduce((needed, b) => {
      needed[b.type] ??= 0;
      needed[b.type] += b.count;
      return needed;
    }, {} as Record<MineralBoostConstant, number>);
    const available = Object.entries(boostsNeeded).every(
      ([type, count]) => boostsAvailable(office, type as MineralBoostConstant, true) >= count
    );
    if (!available) return best;
    if (!best) {
      return build;
    }
    if (build.tier < best.tier) {
      return best;
    }
    return available ? build : best;
  }, undefined as undefined | CreepBuild);
  if (bestBuild) return [bestBuild];
  return [];
}
