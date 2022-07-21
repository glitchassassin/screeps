import { Mission, MissionType } from "Missions/Mission";

declare global {
  interface CreepMemory {
      runState?: string
  }
}

export function runStates<M extends Mission<MissionType>>(
  states: Record<string, (mission: M, creep: Creep) => string>,
  mission: M,
  creep: Creep
) {
  const statesRun: string[] = [];
  creep.memory.runState = creep.memory.runState ?? Object.keys(states)[0]; // First state is default
  while (!statesRun.includes(creep.memory.runState)) {
    statesRun.push(creep.memory.runState);
    creep.memory.runState = states[creep.memory.runState](mission, creep);
  }
}
