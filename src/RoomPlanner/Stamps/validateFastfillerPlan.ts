import { FastfillerPlan } from 'RoomPlanner';

export function validateFastfillerPlan(plan: Partial<FastfillerPlan>) {
  if (
    plan.extensions?.length !== 15 ||
    plan.spawns?.length !== 3 ||
    plan.containers?.length !== 2 ||
    !plan.roads?.length
  ) {
    throw new Error(`Incomplete FastfillerPlan`);
  } else {
    return plan as FastfillerPlan;
  }
}
