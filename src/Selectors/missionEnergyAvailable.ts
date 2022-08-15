import { estimateMissionInterval } from 'Missions/Selectors';
import { roomPlans } from './roomPlans';
import { energyInProduction, roomEnergyAvailable } from './storageEnergyAvailable';

export const missionEnergyAvailable = (office: string) => {
  let energy = roomEnergyAvailable(office);
  if (!roomPlans(office)?.headquarters?.storage.structure) {
    energy += energyInProduction(office, estimateMissionInterval(office));
  }
  return energy;
};
