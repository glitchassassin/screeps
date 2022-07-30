import { createRefillMission } from 'Missions/Implementations/Refill';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission, pendingMissions, submitMission } from 'Missions/Selectors';
import { fastfillerPositions } from 'Reports/fastfillerPositions';
import { roomHasExtensions } from 'Selectors/getExtensionsCapacity';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { unpackPos } from 'utils/packrat';

/**
 * Maintain four refillers in fastfiller
 */
export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // Scale refill down if needed to fit energy
    const active = activeMissions(office).filter(isMission(MissionType.REFILL));
    const pending = pendingMissions(office).filter(isMission(MissionType.REFILL));
    const positionsNeeded = fastfillerPositions(office).filter(
      p => ![...active, ...pending].some(m => unpackPos(m.data.refillSquare).isEqualTo(p))
    );

    if (!active.length) {
      pending.forEach(
        m => (m.estimate.energy = createRefillMission(office, unpackPos(m.data.refillSquare)).estimate.energy)
      );
    }
    if (!roomHasExtensions(office) || !hasEnergyIncome(office)) return; // Only one pending mission needed at a time; skip if we have no extensions or very low energy

    // Maintain four fastfillers
    for (const pos of positionsNeeded) {
      submitMission(office, createRefillMission(office, pos));
    }
  }
};
