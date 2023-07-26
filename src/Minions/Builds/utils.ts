import { buildCost, minionCost } from 'Selectors/minionCostPerTick';

type BoostsForPart = Partial<{
  [P in Exclude<BodyPartConstant, CLAIM>]: keyof typeof BOOSTS[P];
}>;

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

function boostTier(boost: MineralBoostConstant): number {
  if (boost.startsWith('X')) return 3;
  if (boost.includes('2')) return 2;
  return 1;
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
  const body: BodyPartConstant[] = new Array(segmentCount).fill(segment).flat();
  if (actualOpts.sorted) body.sort().reverse();
  body.push(...actualOpts.suffix);
  return body;
}

export const unboosted = (body: BodyPartConstant[]): CreepBuild => (
  {
    body,
    boosts: [],
    tier: 0,
    cost: buildCost(body, [])
  }
);

export const boosted = (body: BodyPartConstant[], boosts: BoostsForPart): CreepBuild => (
  {
    body,
    boosts: body.reduce(
      (acc, part) => {
        if (part === CLAIM) return acc; // no boosts for claim
        const boost = boosts[part];
        if (boost) {
          const existing = acc.find(b => b.type === boost);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ type: boost, count: 1 });
          }
        }
        return acc;
      },
      [] as { type: MineralBoostConstant; count: number }[]
    ),
    tier: Math.max(...Object.values(boosts).map(b => boostTier(b)), 0),
    cost: buildCost(body, [])
  }
);

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
