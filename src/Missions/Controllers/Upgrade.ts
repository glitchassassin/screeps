import { createUpgradeMission } from "Missions/Implementations/Upgrade";
import { MissionType } from "Missions/Mission";
import { activeMissions, isMission, pendingMissions, submitMission } from "Missions/Selectors";
import { hasEnergyIncome } from "Selectors/hasEnergyIncome";
import { rcl } from "Selectors/rcl";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (
      pendingMissions(office).filter(isMission(MissionType.UPGRADE)).length >= 2 ||
      rcl(office) < 2 ||
      (activeMissions(office).some(isMission(MissionType.UPGRADE)) && (
        rcl(office) === 8 ||
        pendingMissions(office).some(isMission(MissionType.ENGINEER))
      ))
    ) {
      const pendingMission = pendingMissions(office).find(isMission(MissionType.UPGRADE));
      if (pendingMission && Game.rooms[office].controller!.ticksToDowngrade < 10000) pendingMission.data.emergency = true;
      return;
    };

    // Only one pending upgrade mission at a time, post RCL 1; only one active, if
    // we have construction to do or we are at RCL8

    if (hasEnergyIncome(office)) {
      submitMission(office, createUpgradeMission(office));
    }
  }
}
