import { BackfillPlan } from 'RoomPlanner';

export function validateBackfillPlan(plan: Partial<BackfillPlan>) {
  if (!plan.towers?.length) {
    throw new Error(`Incomplete BackfillPlan`);
  } else {
    return plan as BackfillPlan;
  }
}
