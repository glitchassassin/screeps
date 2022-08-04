import { ExtensionsPlan } from 'RoomPlanner';

export function validateExtensionsPlan(plan: Partial<ExtensionsPlan>) {
  if (!plan.extensions?.length || !plan.roads?.length) {
    throw new Error(`Incomplete ExtensionsPlan`);
  } else {
    return plan as ExtensionsPlan;
  }
}
