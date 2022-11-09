import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { memoizeByTick } from 'utils/memoizeFunction';
import { storageEnergyAvailable } from './storageEnergyAvailable';

export const hasEnergyIncome = memoizeByTick(
  office => office,
  (office: string): boolean => {
    const harvestMissions = activeMissions(office)
      .filter(isMission(HarvestMission))
      .some(m => m.harvestRate() > 0);
    const logisticsMissions = activeMissions(office)
      .filter(isMission(LogisticsMission))
      .some(m => m.capacity() > 0);
    return (
      (harvestMissions && logisticsMissions) ||
      storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable
    );
  }
);
