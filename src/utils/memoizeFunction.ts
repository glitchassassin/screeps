/**
 * Generic memoizer. Given a function and a way to derive a key from its parameters, cache the
 * results of the function for each combination of parameters for a given number of ticks.
 *
 * Example:
 * ```
 * export const getRoomPathDistance = memoize(
 *   (room1: string, room2: string) => [room1, room2].sort().join(''),
 *   (room1: string, room2: string) => {
 *     const newRoute = Game.map.findRoute(room1, room2, {
 *       routeCallback: room => (getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0)
 *     });
 *     if (newRoute === -2) return undefined;
 *     return newRoute.length;
 *   }
 * );
 * ```
 *
 * Note that the returned value, if not a primitive, is a reference - so if you mutate the
 * returned value elsewhere in your code, that change will be reflected next time you call
 * this function.
 *
 * Example:
 * ```
 * // resets the set automatically every 10 ticks
 * export const creepsThatNeedEnergy = memoize(
 *   (room: string) => room,
 *   (room: string) => new Set<string>(),
 *   10
 * )
 *
 * creepsThatNeedEnergy().add(creep.name);
 *
 * for (const creepName of creepsThatNeedEnergy()) {
 *   // get energy to creep
 * }
 * ```
 *
 * @param indexer Return a unique string as a key for the given combination of `fn`'s parameters
 * @param fn Generates some value to cache
 * @param resetAfterTicks Resets all cached values every `n` ticks
 * @returns The cached return value from `fn`
 */
export const memoize = <T extends Array<any>, U>(
  indexer: (...args: T) => string,
  fn: (...args: T) => U,
  resetAfterTicks = Infinity
) => {
  let resultsMap = new Map<string, U>();
  let lastTick = Game.time;
  return (...args: T): U => {
    if (Game.time >= lastTick + resetAfterTicks) {
      lastTick = Game.time;
      resultsMap = new Map<string, U>();
    }
    const key = indexer(...args);
    if (!resultsMap.has(key)) {
      resultsMap.set(key, fn(...args));
    }
    return resultsMap.get(key) as U;
  };
};

/**
 * A shorthand invocation of `memoize` where the results should reset every tick
 *
 * Example:
 * ```
 * export const buyMarketPrice = memoizeByTick(
 *   (resourceType: MarketResourceConstant) => resourceType,
 *   (resourceType: MarketResourceConstant) =>
 *     Math.min(...Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).map(o => o.price), Infinity)
 * );
 * ```
 */
export const memoizeByTick = <T extends Array<any>, U>(indexer: (...args: T) => string, fn: (...args: T) => U) =>
  memoize(indexer, fn, 1);

/**
 * A shorthand invocation of `memoize` where the function has no parameters to generate a key.
 * Results are generated once and cached for `resetAfterTicks` ticks
 *
 * Example:
 * ```
 * export const roomData = memoizeOnce(
 *   () => {
 *     return Object.keys(Game.rooms)
 *       .reduce(
 *         (acc, roomName) => acc[roomName] = {},
 *         {} as Record<string, any>
 *       )
 *   },
 *   100
 * )
 * ```
 */
export const memoizeOnce = <T extends Array<any>, U>(fn: (...args: T) => U, resetAfterTicks = Infinity) =>
  memoize(() => '', fn, resetAfterTicks);

/**
 * A shorthand invocation of `memoize` where the function has no parameters to generate a key
 * and should reset each tick. Results are generated once every tick.
 *
 * Example:
 * ```
 * export const ordersByResourceType = memoizeOncePerTick(() => {
 *   return Game.market.getAllOrders().reduce(
 *     (acc, order) => {
 *       acc[order.resourceType] ??= [];
 *       acc[order.resourceType].push(order);
 *     },
 *     {} as Record<MarketResourceConstant, Order[]>
 *   )
 * })
 * ```
 */
export const memoizeOncePerTick = <T extends Array<any>, U>(fn: (...args: T) => U) => memoize(() => '', fn, 1);
