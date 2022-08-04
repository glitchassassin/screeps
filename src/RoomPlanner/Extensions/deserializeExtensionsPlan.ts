import type { ExtensionsPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateExtensionsPlan } from './validateExtensionsPlan';

export function deserializeExtensionsPlan(serialized: string) {
  const plan: Partial<ExtensionsPlan> = {
    extensions: [],
    roads: [],
    ramparts: []
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_EXTENSION)(s)) plan.extensions?.push(s);
    if (isPlannedStructure(STRUCTURE_ROAD)(s)) plan.roads?.push(s);
    if (isPlannedStructure(STRUCTURE_RAMPART)(s)) plan.ramparts?.push(s);
  }
  return validateExtensionsPlan(plan);
}
