import { buildCost, minionCost } from 'Selectors/minionCostPerTick';

export interface CreepBuild {
  body: BodyPartConstant[];
  boosts: {
    type: MineralBoostConstant;
    count: number;
  }[];
  tier: number;
  /**
   * Cost of build (including boosts). Used to optimize builds, not for budgeting.
   */
  cost: number;
}

interface BuildFromSegmentOpts {
  maxSegments: number;
  sorted: boolean;
  suffix: BodyPartConstant[];
}

export function buildFromSegment(
  energy: number,
  segment: BodyPartConstant[],
  opts: Partial<BuildFromSegmentOpts> = {}
) {
  if (segment.length === 0 || energy === 0) return [];
  const actualOpts = {
    maxSegments: Infinity,
    sorted: false,
    suffix: [] as BodyPartConstant[],
    ...opts
  };
  energy -= minionCost(actualOpts.suffix);
  const segmentCost = minionCost(segment);
  if (energy < segmentCost) {
    console.log('Minion builder error:', energy, 'not enough for segment', JSON.stringify(segment));
    return [];
  }
  const segmentCount = Math.min(
    Math.floor(energy / segmentCost),
    Math.floor((50 - actualOpts.suffix.length) / segment.length),
    actualOpts.maxSegments
  );
  const body = new Array(segmentCount).fill(segment).flat();
  if (actualOpts.sorted) body.sort().reverse();
  body.push(...actualOpts.suffix);
  return body;
}

export const unboosted = (body: BodyPartConstant[]): CreepBuild[] => [
  {
    body,
    boosts: [],
    tier: 0,
    cost: buildCost(body, [])
  }
];

export const atLeastTier =
  (tier: number) =>
  (build: CreepBuild): boolean =>
    build.tier >= tier;
export const belowTier =
  (tier: number) =>
  (build: CreepBuild): boolean =>
    build.tier < tier;
export const isTier =
  (tier: number) =>
  (build: CreepBuild): boolean =>
    build.tier === tier;
