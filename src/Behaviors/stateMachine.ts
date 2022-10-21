import { Mission, MissionType } from 'Missions/Mission';
import { debugCPU, resetDebugCPU } from 'utils/debugCPU';

declare global {
  interface CreepMemory {
    runState?: string;
  }
}

export function runStates<M extends Mission<MissionType>>(
  states: Record<string, (mission: M, creep: Creep) => string>,
  mission: M,
  creep: Creep,
  profile = false
) {
  const statesRun: string[] = [];
  creep.memory.runState = creep.memory.runState ?? Object.keys(states)[0]; // First state is default
  if (profile) resetDebugCPU();
  while (!statesRun.includes(creep.memory.runState)) {
    statesRun.push(creep.memory.runState);
    if (!(creep.memory.runState in states)) {
      console.log('Error: mission', mission.type, 'has no state', creep.memory.runState);
      delete creep.memory.runState;
      return;
    }
    const key = `${mission.type}_${creep.memory.runState}`;
    creep.memory.runState = states[creep.memory.runState](mission, creep);
    if (profile) debugCPU(key);
  }
}
