import { BOOSTS_BY_INTENT } from 'gameConstants';
import { buildCost } from 'Selectors/minionCostPerTick';
import { CreepBuild } from './utils';

export const buildPowerbankAttacker = (): CreepBuild[] => {
  const builds: CreepBuild[] = [];
  const tiers = [
    { tough: 2, attack: 38, move: 10, tier: 3 },
    { tough: 3, attack: 34, move: 13, tier: 2 },
    { tough: 3, attack: 30, move: 17, tier: 1 },
    { tough: 0, attack: 22, move: 28, tier: 0 }
  ];
  for (const { tough, attack, move, tier } of tiers) {
    const body = ([] as BodyPartConstant[]).concat(
      Array(tough).fill(TOUGH),
      Array(move).fill(MOVE),
      Array(attack).fill(ATTACK)
    );
    const boosts = tier
      ? [
          { type: BOOSTS_BY_INTENT.TOUGH[tier - 1], count: tough },
          { type: BOOSTS_BY_INTENT.ATTACK[tier - 1], count: attack },
          { type: BOOSTS_BY_INTENT.MOVE[tier - 1], count: move }
        ]
      : [];
    //
    builds.push({
      body,
      boosts,
      tier,
      cost: buildCost(body, boosts)
    });
  }
  return builds;
};

export const buildPowerbankHealer = (): CreepBuild[] => {
  const builds: CreepBuild[] = [];
  const tiers = [
    { heal: 38, move: 10, tier: 3 },
    { heal: 35, move: 11, tier: 2 },
    { heal: 33, move: 16, tier: 1 },
    { heal: 28, move: 22, tier: 0 }
  ];
  for (const { heal, move, tier } of tiers) {
    const body = ([] as BodyPartConstant[]).concat(Array(move).fill(MOVE), Array(heal).fill(HEAL));
    const boosts = tier
      ? [
          { type: BOOSTS_BY_INTENT.HEAL[tier - 1], count: heal },
          { type: BOOSTS_BY_INTENT.MOVE[tier - 1], count: move }
        ]
      : [];
    builds.push({
      body,
      boosts,
      tier,
      cost: buildCost(body, boosts)
    });
  }
  return builds;
};
