import { activeMissions } from 'Missions/Selectors';
import { energyInProduction } from 'Selectors/energyInProduction';
import { roomEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { MissionEnergyAvailable } from './missionEnergyAvailable';

export const updateMissionEnergyAvailable = () => {
  // run every 3 ticks
  if (Game.time % 3) return;
  for (const office in Memory.offices) {
    let energy =
      Math.max(roomEnergyAvailable(office), energyInProduction(office)) -
      (Game.rooms[office].energyCapacityAvailable - Game.rooms[office].energyAvailable);
    for (const mission of activeMissions(office)) {
      energy -= mission.energyRemaining();
    }
    MissionEnergyAvailable[office] = energy;
  }
};
