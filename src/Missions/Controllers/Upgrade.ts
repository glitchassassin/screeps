import { createUpgradeMission } from "Missions/Implementations/Upgrade";
import { MissionType } from "Missions/Mission";
import { constructionToDo } from "Selectors/facilitiesWorkToDo";
import { hasEnergyIncome } from "Selectors/hasEnergyIncome";
import { rcl } from "Selectors/rcl";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (
      Memory.offices[office].pendingMissions.some(m => m.type === MissionType.UPGRADE) ||
      rcl(office) < 2 ||
      (Memory.offices[office].activeMissions.some(m => m.type === MissionType.UPGRADE) && (
        constructionToDo(office).length ||
        rcl(office) === 8
      ))
    ) {
      const pendingMission = Memory.offices[office].pendingMissions.find(m => m.type === MissionType.UPGRADE);
      if (pendingMission && Game.rooms[office].controller!.ticksToDowngrade < 10000) pendingMission.data.emergency = true;
      return;
    };

    // Only one pending upgrade mission at a time, post RCL 1; only one active, if
    // we have construction to do or we are at RCL8

    if (hasEnergyIncome(office)) {
      Memory.offices[office].pendingMissions.push(createUpgradeMission(office));
    }
  }
}
