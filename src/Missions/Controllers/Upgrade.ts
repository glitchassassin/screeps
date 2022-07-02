import { HarvestMission } from "Missions/Implementations/Harvest";
import { LogisticsMission } from "Missions/Implementations/Logistics";
import { createUpgradeMission } from "Missions/Implementations/Upgrade";
import { MissionStatus, MissionType } from "Missions/Mission";
import { constructionToDo } from "Selectors/facilitiesWorkToDo";
import { rcl } from "Selectors/rcl";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (
      Memory.offices[office].pendingMissions.some(m => m.type === MissionType.UPGRADE) ||
      rcl(office) < 2 ||
      (Memory.offices[office].activeMissions.some(m => m.type === MissionType.UPGRADE) && constructionToDo(office).length)
    ) return; // Only one pending upgrade mission at a time, post RCL 1; only one active, if we have construction to do too

    const harvestMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.HARVEST && m.status === MissionStatus.RUNNING) as HarvestMission[];
    const logisticsMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.LOGISTICS && m.status === MissionStatus.RUNNING) as LogisticsMission[];

    if (harvestMissions.length && logisticsMissions.length) {
      Memory.offices[office].pendingMissions.push(createUpgradeMission(office));
    }
  }
}
