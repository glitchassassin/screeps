import type { LibraryPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateLibraryPlan } from './validateLibraryPlan';

export function deserializeLibraryPlan(serialized: string) {
  const plan: Partial<LibraryPlan> = {
    container: undefined,
    link: undefined
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_CONTAINER)(s)) plan.container = s;
    if (isPlannedStructure(STRUCTURE_LINK)(s)) plan.link = s;
  }
  return validateLibraryPlan(plan);
}
