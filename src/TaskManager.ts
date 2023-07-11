import { debugCPU, resetDebugCPU } from "utils/debugCPU";

interface Task {
  name: string;
  fn: () => void;
  mandatory?: boolean;
  runEvery?: number;
  threshold?: number;
}

const lastRun = new Map<string, number>();

export function runTaskManager(tasks: Task[], cpuLimit: number, debug = false) {
  const start = Game.cpu.getUsed();
  if (debug) resetDebugCPU(true);
  for (const task of tasks) {
    if (!task.mandatory && Game.cpu.getUsed() - start > cpuLimit) {
      if (debug) console.log(Game.time, 'skipping task', task.name);
      continue;
    }
    if (task.threshold && Game.cpu.bucket < task.threshold) {
      if (debug) console.log(Game.time, 'skipping task', task.name, 'due to low bucket');
      continue;
    }
    if (
      (!task.runEvery || (lastRun.get(task.name) ?? 0) + task.runEvery < Game.time)
    ) {
      task.fn();
      if (debug) debugCPU(task.name);
      lastRun.set(task.name, Game.time);
    }
  }
}
