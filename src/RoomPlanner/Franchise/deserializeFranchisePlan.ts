import type { FranchisePlan } from 'RoomPlanner';
import { deserializePlannedStructures } from 'Selectors/plannedStructures';
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
    if (s.structureType === STRUCTURE_LINK) plan.link = s;
    if (s.structureType === STRUCTURE_CONTAINER) plan.container = s;
    if (s.structureType === STRUCTURE_RAMPART) plan.ramparts?.push(s);
    if (s.structureType === STRUCTURE_EXTENSION) plan.extensions?.push(s);
  }
  return validateFranchisePlan(plan);
}
