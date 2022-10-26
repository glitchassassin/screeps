import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { sum } from 'Selectors/reducers';

export const franchiseIncome = (office: string) => {
  return activeMissions(office)
    .filter(isMission(HarvestMission))
    .map(m => m.harvestRate())
    .reduce(sum, 0);
};
