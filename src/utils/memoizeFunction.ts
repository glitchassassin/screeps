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

export const memoizeByTick = <T extends Array<any>, U>(indexer: (...args: T) => string, fn: (...args: T) => U) =>
  memoize(indexer, fn, 1);
