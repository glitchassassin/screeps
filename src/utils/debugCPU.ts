let start = 0;
let current = 0;

export const resetDebugCPU = (inMemory = false) => {
  start = Game.cpu.getUsed();
  current = start;
  if (!inMemory) {
    console.log(` -=< Starting CPU debug >=-         [ 0.000 | 0.000 ]`);
  } else {
    Memory.stats.profiling = {};
  }
};
export const debugCPU = (context: string, inMemory = false) => {
  let previous = current;
  current = Game.cpu.getUsed();
  if (!inMemory) {
    console.log(`${context.padEnd(35)} [ ${(current - previous).toFixed(3)} | ${(current - start).toFixed(3)} ]`);
  } else {
    if (!Memory.stats) return;
    Memory.stats.profiling ??= {};
    Memory.stats.profiling[context] = (Memory.stats.profiling[context] ?? 0) + current - previous;
  }
};
