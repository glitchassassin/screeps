import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { memoizeByTick } from 'utils/memoizeFunction';

export const energyInProduction = memoizeByTick(
  office => office,
  (office: string) => {
    let harvestCapacity = 0;
    let haulCapacity = 0;
    for (const mission of activeMissions(office)) {
      if (isMission(LogisticsMission)(mission)) {
        haulCapacity += mission.capacity();
      }
      if (isMission(HarvestMission)(mission)) {
        harvestCapacity += mission.harvestRate();
      }
    }
    return Math.min(harvestCapacity, haulCapacity);
  }
);
