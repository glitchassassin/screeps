import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { memoizeByTick } from 'utils/memoizeFunction';
import { averageActiveFranchiseRoundTripDistance } from './Franchises/furthestActiveFranchiseRoundTripDistance';

export const energyInProduction = memoizeByTick(
  office => office,
  (office: string) => {
    // capacity per hauling cycle
    let harvestCapacity = 0;
    let haulCapacity = 0;
    // creep cost per hauling cycle
    let creepCost = 0;
    for (const mission of activeMissions(office)) {
      if (isMission(LogisticsMission)(mission)) {
        haulCapacity += mission.capacity();
        creepCost += mission.creepCost();
      }
      if (isMission(HarvestMission)(mission)) {
        harvestCapacity += mission.haulingCapacityNeeded();
        creepCost += mission.creepCost();
      }
    }

    const haulingCycles = CREEP_LIFE_TIME / averageActiveFranchiseRoundTripDistance(office)
    creepCost /= haulingCycles;

    return Math.max(0, Math.min(harvestCapacity, haulCapacity) - creepCost);
  }
);
