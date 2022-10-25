import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { MissionStatus } from 'Missions/Mission';
import { activeMissions, and, isMission, isStatus } from 'Missions/Selectors';
import { memoizeByTick } from 'utils/memoizeFunction';
import { storageEnergyAvailable } from './storageEnergyAvailable';

export const hasEnergyIncome = memoizeByTick(
  office => office,
  (office: string) => {
    const harvestMissions = activeMissions(office).some(
      and(isMission(HarvestMission), isStatus(MissionStatus.RUNNING))
    );
    const logisticsMissions = activeMissions(office).some(
      and(isMission(LogisticsMission), isStatus(MissionStatus.RUNNING))
    );
    return (
      (harvestMissions && logisticsMissions) ||
      storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable
    );
  }
);
