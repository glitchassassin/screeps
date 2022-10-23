import { SpawnOrder } from 'Minions/spawnQueues';
import { MissionType } from 'Missions/Mission';
import { createRefillOrder } from 'Missions/OldImplementations/Refill';
import { activeMissions, isMission } from 'Missions/Selectors';
import { fastfillerPositions } from 'Reports/fastfillerPositions';
import { roomHasExtensions } from 'Selectors/getExtensionsCapacity';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { roomPlans } from 'Selectors/roomPlans';
import { unpackPos } from 'utils/packrat';

/**
 * Maintain four refillers in fastfiller
 */
export default {
  name: 'Refill',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    const orders: SpawnOrder[] = [];
    // Scale refill down if needed to fit energy
    const active = activeMissions(office).filter(isMission(MissionType.REFILL));
    const positionsNeeded = fastfillerPositions(office).filter(
      p => ![...active].some(m => unpackPos(m.data.refillSquare).isEqualTo(p))
    );

    if (
      (!roomHasExtensions(office) && !roomPlans(office)?.fastfiller?.containers.some(s => s.structure)) ||
      !hasEnergyIncome(office)
    )
      return orders; // Only one pending mission needed at a time; skip if we have no extensions or very low energy

    // Maintain four fastfillers
    for (const pos of positionsNeeded) {
      orders.push(createRefillOrder(office, pos));
    }

    return orders;
  }
};
