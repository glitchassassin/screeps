
let enabled: boolean|undefined = undefined;
export const marketEnabled = () => {
  if (enabled === undefined) enabled = !!Game.market.getHistory(RESOURCE_ENERGY).length;
  return enabled;
}
