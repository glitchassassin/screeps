import { BOOSTS_BY_INTENT } from 'gameConstants';
import { buildCost } from 'Selectors/minionCostPerTick';
import { CreepBuild } from './utils';

export const buildResearch = (energy: number, maxWorkParts = 15): CreepBuild[] => {
  if (energy < 250 || maxWorkParts <= 0) {
    return [];
  } else {
    // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
    let workParts = Math.max(1, Math.min(Math.floor(maxWorkParts), Math.floor((energy * 10) / 13 / 100)));
    let carryParts = Math.max(1, Math.min(3, Math.floor((energy * 1) / 13 / 50)));
    let moveParts = Math.max(1, Math.min(6, Math.floor((energy * 2) / 13 / 50)));
    // console.log(energy, maxWorkParts, workParts)
    const body = ([] as BodyPartConstant[]).concat(
      Array(workParts).fill(WORK),
      Array(carryParts).fill(CARRY),
      Array(moveParts).fill(MOVE)
    );

    const tiers = [3, 2, 1, 0];

    // any level of boosts, depending on availability
    return tiers.map(tier => {
      const boosts = tier > 0 ? [{ type: BOOSTS_BY_INTENT.UPGRADE[tier - 1], count: workParts }] : [];
      return { body, boosts, tier, cost: buildCost(body, boosts) };
    });
  }
};
