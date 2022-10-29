const queue = new Map<number, (() => void)[]>();

export const schedule = (fn: () => void, ticks: number) => {
  const list = queue.get(Game.time + ticks) ?? [];
  list.push(fn);
  queue.set(Game.time + ticks, list);
};

export const runScheduled = () => {
  for (const [k, entries] of queue) {
    if (k <= Game.time) {
      entries.forEach(fn => fn());
      queue.delete(k);
    }
  }
};
