import type { HeadquartersPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateHeadquartersPlan } from './validateHeadquartersPlan';

export function deserializeHeadquartersPlan(serialized: string) {
  const plan: Partial<HeadquartersPlan> = {
    link: undefined,
    factory: undefined,
    storage: undefined,
    terminal: undefined,
    nuker: undefined,
    roads: [],
    extension: undefined
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_NUKER)(s)) plan.nuker = s;
    if (isPlannedStructure(STRUCTURE_POWER_SPAWN)(s)) plan.powerSpawn = s;
    if (isPlannedStructure(STRUCTURE_LINK)(s)) plan.link = s;
    if (isPlannedStructure(STRUCTURE_FACTORY)(s)) plan.factory = s;
    if (isPlannedStructure(STRUCTURE_STORAGE)(s)) plan.storage = s;
    if (isPlannedStructure(STRUCTURE_TERMINAL)(s)) plan.terminal = s;
    if (isPlannedStructure(STRUCTURE_EXTENSION)(s)) plan.extension = s;
    if (isPlannedStructure(STRUCTURE_ROAD)(s)) plan.roads?.push(s);
  }
  return validateHeadquartersPlan(plan);
}
