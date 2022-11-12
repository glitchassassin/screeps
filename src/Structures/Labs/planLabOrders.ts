import { boostQuotas } from 'Selectors/boostQuotas';
import { roomPlans } from 'Selectors/roomPlans';
import { getLabOrders } from './getLabOrderDependencies';

export function planLabOrders(office: string) {
  // Prune completed orders
  Memory.offices[office].lab.orders = Memory.offices[office].lab.orders.filter(o => o.amount > 0);

  const terminal = roomPlans(office)?.headquarters?.terminal.structure as StructureTerminal | undefined;
  if (!terminal) return;

  // Maintain quotas
  if (Memory.offices[office].lab.orders.length === 0) {
    for (const { boost, amount } of boostQuotas(office)) {
      const difference = amount - terminal.store.getUsedCapacity(boost);
      if (difference > 0) {
        try {
          Memory.offices[office].lab.orders.push(...getLabOrders(boost, difference, terminal));
        } catch {
          // No market and not enough ingredients
          continue;
        }
      }
    }
  }
}
