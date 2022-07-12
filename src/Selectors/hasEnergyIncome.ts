import { HarvestMission } from "Missions/Implementations/Harvest";
import { LogisticsMission } from "Missions/Implementations/Logistics";
import { MissionStatus, MissionType } from "Missions/Mission";
import { memoizeByTick } from "utils/memoizeFunction";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export const hasEnergyIncome = memoizeByTick(
  office => office,
  (office: string) => {
    const harvestMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.HARVEST && m.status === MissionStatus.RUNNING) as HarvestMission[];
    const logisticsMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.LOGISTICS && m.status === MissionStatus.RUNNING) as LogisticsMission[];
    return ((harvestMissions.length && logisticsMissions.length) || storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable)
  }
);
