import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { MobileRefillMission } from 'Missions/Implementations/MobileRefillMission';
import { activeMissions, isMission, not } from 'Missions/Selectors';
import { memoizeByTick } from 'utils/memoizeFunction';
import { storageEnergyAvailable } from './storageEnergyAvailable';

export const hasEnergyIncome = memoizeByTick(
  office => office,
  (office: string) => {
    const harvestMissions = activeMissions(office)
      .filter(isMission(HarvestMission))
      .some(m => m.harvestRate() > 0);
    const logisticsMissions = activeMissions(office)
      .filter(isMission(LogisticsMission))
      .filter(not(isMission(MobileRefillMission)))
      .some(m => m.capacity() > 0);
    return (
      (harvestMissions && logisticsMissions) ||
      storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable
    );
  }
);
