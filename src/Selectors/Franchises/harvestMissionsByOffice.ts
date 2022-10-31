import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { isMission, missionsByOffice } from 'Missions/Selectors';

export const harvestMissionsByOffice = (officeName: string) => {
  return missionsByOffice()[officeName].filter(isMission(HarvestMission));
};
