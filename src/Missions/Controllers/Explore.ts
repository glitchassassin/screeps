import { createExploreMission } from "Missions/Implementations/Explore";
import { MissionType } from "Missions/Mission";
import { hasEnergyIncome } from "Selectors/hasEnergyIncome";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (
      Memory.offices[office].pendingMissions.some(m => m.type === MissionType.EXPLORE) ||
      Memory.offices[office].activeMissions.some(m => m.type === MissionType.EXPLORE)
    ) return; // Only one pending logistics mission at a time

    if (hasEnergyIncome(office)) {
      Memory.offices[office].pendingMissions.push(createExploreMission(office));
    }
  }
}
