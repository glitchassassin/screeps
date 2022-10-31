import type { FranchisePlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import { isPlannedStructure } from 'Selectors/typeguards';
import { validateFranchisePlan } from './validateFranchisePlan';

export function deserializeFranchisePlan(serialized: string) {
  const plan: Partial<FranchisePlan> = {
    sourceId: serialized.slice(0, 24).trim() as Id<Source>,
    link: undefined,
    container: undefined,
    extensions: [],
    ramparts: []
  };
  for (const s of deserializePlannedStructures(serialized.slice(24))) {
    if (isPlannedStructure(STRUCTURE_LINK)(s)) plan.link = s;
    if (isPlannedStructure(STRUCTURE_CONTAINER)(s)) plan.container = s;
    if (isPlannedStructure(STRUCTURE_RAMPART)(s)) plan.ramparts?.push(s);
    if (isPlannedStructure(STRUCTURE_EXTENSION)(s)) plan.extensions?.push(s);
  }
  return validateFranchisePlan(plan);
}
