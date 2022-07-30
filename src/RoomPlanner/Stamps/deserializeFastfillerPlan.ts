import type { FastfillerPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateFastfillerPlan } from './validateFastfillerPlan';

export function deserializeFastfillerPlan(serialized: string) {
  const plan: FastfillerPlan = {
    extensions: [],
    spawns: [],
    containers: [],
    roads: []
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_EXTENSION)(s)) {
      plan.extensions.push(s);
    } else if (isPlannedStructure(STRUCTURE_ROAD)(s)) {
      plan.roads.push(s);
    } else if (isPlannedStructure(STRUCTURE_SPAWN)(s)) {
      plan.spawns.push(s);
    } else if (isPlannedStructure(STRUCTURE_CONTAINER)(s)) {
      plan.containers.push(s);
    }
  }
  return validateFastfillerPlan(plan);
}
