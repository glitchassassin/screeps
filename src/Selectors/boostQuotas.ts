import { BOOSTS_BY_INTENT } from 'gameConstants';

export const boostQuotas = (office: string) => {
  return [
    ...BOOSTS_BY_INTENT.TOUGH,
    ...BOOSTS_BY_INTENT.ATTACK,
    ...BOOSTS_BY_INTENT.MOVE,
    ...BOOSTS_BY_INTENT.HEAL,
    ...BOOSTS_BY_INTENT.HARVEST,
    ...BOOSTS_BY_INTENT.UPGRADE
  ]
    .map(boost => ({
      boost,
      amount: 30 * 50
    }))
    .sort((a, b) => a.boost.length - b.boost.length); // sort T1 boosts to the front of the queue
};
