import { MissionStatus, MissionType } from "Missions/Mission";
import { activeMissions, and, isMission, isStatus } from "Missions/Selectors";
import { memoizeByTick } from "utils/memoizeFunction";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export const hasEnergyIncome = memoizeByTick(
  office => office,
  (office: string) => {
    const harvestMissions = activeMissions(office).some(and(isMission(MissionType.HARVEST), isStatus(MissionStatus.RUNNING)));
    const logisticsMissions = activeMissions(office).some(and(isMission(MissionType.LOGISTICS), isStatus(MissionStatus.RUNNING)));
    return ((harvestMissions && logisticsMissions) || storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable)
  }
);
