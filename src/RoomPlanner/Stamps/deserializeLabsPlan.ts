import type { LabsPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateLabsPlan } from './validateLabsPlan';

export function deserializeLabsPlan(serialized: string) {
  const plan: LabsPlan = {
    labs: [],
    roads: []
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_LAB)(s)) {
      plan.labs.push(s);
    } else if (isPlannedStructure(STRUCTURE_ROAD)(s)) {
      plan.roads.push(s);
    }
  }
  return validateLabsPlan(plan);
}
