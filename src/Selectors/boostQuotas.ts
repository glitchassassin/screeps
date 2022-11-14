import { BOOSTS_BY_INTENT } from 'gameConstants';

export const boostQuotas = (office: string) => {
  return [...BOOSTS_BY_INTENT.UPGRADE, ...BOOSTS_BY_INTENT.HARVEST]
    .filter(<T>(b: T): b is Exclude<T, null> => b !== null)
    .map(boost => ({
      boost,
      amount: 30 * 50
    }))
    .sort((a, b) => a.boost.length - b.boost.length); // sort T1 boosts to the front of the queue
};
