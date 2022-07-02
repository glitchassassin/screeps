import { createExploreMission } from "Missions/Implementations/Explore";
import { HarvestMission } from "Missions/Implementations/Harvest";
import { LogisticsMission } from "Missions/Implementations/Logistics";
import { MissionStatus, MissionType } from "Missions/Mission";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (
      Memory.offices[office].pendingMissions.some(m => m.type === MissionType.EXPLORE) ||
      Memory.offices[office].activeMissions.some(m => m.type === MissionType.EXPLORE)
    ) return; // Only one pending logistics mission at a time

    const harvestMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.HARVEST && m.status === MissionStatus.RUNNING) as HarvestMission[];
    const logisticsMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.LOGISTICS && m.status === MissionStatus.RUNNING) as LogisticsMission[];

    if (harvestMissions.length && logisticsMissions.length) {
      Memory.offices[office].pendingMissions.push(createExploreMission(office));
    }
  }
}
