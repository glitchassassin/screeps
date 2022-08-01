import { LibraryPlan } from 'RoomPlanner';

export function validateLibraryPlan(plan: Partial<LibraryPlan>) {
  if (!plan.container || !plan.link) {
    throw new Error(`Incomplete LibraryPlan`);
  } else {
    return plan as LibraryPlan;
  }
}
