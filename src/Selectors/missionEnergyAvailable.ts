import { energyInProduction } from './energyInProduction';
import { roomEnergyAvailable } from './storageEnergyAvailable';

export const missionEnergyAvailable = (office: string) => {
  // Energy in storage/production - room energy deficit = total energy available for budgeting
  // energyInProduction(office, estimateMissionInterval(office))
  let energy =
    Math.max(roomEnergyAvailable(office), energyInProduction(office)) -
    (Game.rooms[office].energyCapacityAvailable - Game.rooms[office].energyAvailable);
  return energy;
};
