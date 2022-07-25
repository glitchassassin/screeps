import { memoizeByTick } from "utils/memoizeFunction";

let enabled: boolean|undefined = undefined;
export const marketEnabled = () => {
  if (enabled === undefined) enabled = !!allMarketOrders().length;
  return enabled;
}

export const allMarketOrders = memoizeByTick(
  () => '',
  () => Game.market.getAllOrders()
)
