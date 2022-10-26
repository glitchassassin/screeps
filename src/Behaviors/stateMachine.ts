import { logCpuStart } from 'utils/logCPU';

declare global {
  interface CreepMemory {
    runState?: string;
  }
}

export function runStates<M extends {}>(
  states: Record<string, (data: M, creep: Creep) => string>,
  data: M,
  creep: Creep,
  profile = false
) {
  const statesRun: string[] = [];
  creep.memory.runState = creep.memory.runState ?? Object.keys(states)[0]; // First state is default
  if (profile) logCpuStart();
  while (!statesRun.includes(creep.memory.runState)) {
    statesRun.push(creep.memory.runState);
    if (!(creep.memory.runState in states)) {
      const state = creep.memory.runState;
      delete creep.memory.runState;
      throw new Error(`Mission has no state: ${state}`);
    }
    creep.memory.runState = states[creep.memory.runState](data, creep);
  }
}
