import type { BackfillPlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateBackfillPlan } from './validateBackfillPlan';

export function deserializeBackfillPlan(serialized: string) {
  const plan: Partial<BackfillPlan> = {
    extensions: [],
    towers: [],
    ramparts: []
  };
  for (const s of deserializePlannedStructures(serialized)) {
    if (isPlannedStructure(STRUCTURE_EXTENSION)(s)) plan.extensions?.push(s);
    if (isPlannedStructure(STRUCTURE_TOWER)(s)) plan.towers?.push(s);
    if (isPlannedStructure(STRUCTURE_RAMPART)(s)) plan.ramparts?.push(s);
  }
  return validateBackfillPlan(plan);
}
