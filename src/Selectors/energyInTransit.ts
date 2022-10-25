import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { memoizeByTick } from 'utils/memoizeFunction';
import { franchiseEnergyAvailable } from './Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from './Franchises/franchisesByOffice';

export const energyInTransit = memoizeByTick(
  office => office,
  (office: string) => {
    // calculate fleet energy levels
    let fleetEnergy = 0;
    let fleetCapacity = 0;
    for (const mission of activeMissions(office).filter(isMission(LogisticsMission))) {
      fleetEnergy += mission.usedCapacity();
      fleetCapacity += mission.capacity();
    }

    // calculate franchise energy levels
    const franchiseEnergy = franchisesByOffice(office).reduce(
      (sum, { source }) => sum + franchiseEnergyAvailable(source),
      0
    );
    return fleetEnergy + Math.min(fleetCapacity, franchiseEnergy);
  }
);
