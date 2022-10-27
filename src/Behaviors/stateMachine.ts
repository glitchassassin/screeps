declare global {
  interface CreepMemory {
    runState?: string;
  }
}

export function runStates<M extends {}, ExtraStates extends string, States extends string>(
  states: Record<States | ExtraStates, (data: M, creep: Creep) => States>,
  data: M,
  creep: Creep
) {
  const statesRun: string[] = [];
  let state = (creep.memory.runState ?? Object.keys(states)[0]) as States | ExtraStates; // First state is default
  creep.memory.runState = state;
  while (!statesRun.includes(state)) {
    statesRun.push(state);
    if (!(state in states)) {
      delete creep.memory.runState;
      throw new Error(`Mission has no state: ${state}`);
    }
    state = states[state](data, creep);
    creep.memory.runState = state;
  }
}
