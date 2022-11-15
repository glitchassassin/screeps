import { boostQuotas } from 'Selectors/boostQuotas';
import { roomPlans } from 'Selectors/roomPlans';
import { getLabOrders } from './getLabOrderDependencies';

export function planLabOrders(office: string) {
  // Prune completed orders
  const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal | undefined;
  if (!terminal) return;

  // Maintain quotas
  if (Memory.offices[office].lab.orders.some(o => o.amount <= 0)) {
    Memory.offices[office].lab.orders = []; // reset after each lab order is completed
  }
  if (Memory.offices[office].lab.orders.length === 0) {
    for (const { boost, amount } of boostQuotas(office)) {
      const difference = amount - terminal.store.getUsedCapacity(boost);
      if (difference > 0) {
        try {
          Memory.offices[office].lab.orders.push(...getLabOrders(boost, difference, terminal));
          break;
        } catch {
          // No market and not enough ingredients
          continue;
        }
      }
    }
  }
}
