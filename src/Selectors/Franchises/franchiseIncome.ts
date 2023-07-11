import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { sum } from 'Selectors/reducers';
import { memoize } from 'utils/memoizeFunction';

export const franchiseIncome = (office: string) => {
  return activeMissions(office)
    .filter(isMission(HarvestMission))
    .map(m => m.harvestRate())
    .reduce(sum, 0);
};

export const franchiseCapacity = memoize( // cached every 10 ticks
  office => office,
  (office: string) => {
    return activeMissions(office)
      .filter(isMission(HarvestMission))
      .map(m => m.haulingCapacityNeeded())
      .reduce(sum, 0);
  },
  10
)
