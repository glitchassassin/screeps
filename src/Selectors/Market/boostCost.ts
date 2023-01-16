import { RESOURCE_INGREDIENTS } from 'gameConstants';
import { buyMarketEnergyPrice } from './marketPrice';

export const boostCost = (boost: MineralCompoundConstant): number => {
  let buyPrice = buyMarketEnergyPrice(boost);
  // get cost of ingredients
  if (!RESOURCE_INGREDIENTS[boost]) {
    return buyPrice; // no ingredients to make it ourselves
  }
  const [ingredient1, ingredient2] = RESOURCE_INGREDIENTS[boost];
  return Math.min(
    buyPrice,
    boostCost(ingredient1 as MineralCompoundConstant) + boostCost(ingredient2 as MineralCompoundConstant)
  );
};
