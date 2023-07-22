import type { MinePlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateMinePlan } from './validateMinePlan';

export function deserializeMinePlan(serialized: string) {
  const plan: Partial<MinePlan> = {
    extractor: undefined,
    container: undefined
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_EXTRACTOR)(s)) plan.extractor = s;
    if (isPlannedStructure(STRUCTURE_CONTAINER)(s)) plan.container = s;
  }
  return validateMinePlan(plan);
}
