import { createMineForemanMission, MineForemanMission } from "Missions/Implementations/MineForeman";
import { createMineHaulerMission, MineHaulerMission } from "Missions/Implementations/MineHauler";
import { MissionType } from "Missions/Mission";
import { isMission, pendingAndActiveMissions, submitMission } from "Missions/Selectors";
import { byId } from "Selectors/byId";
import { marketEnabled } from "Selectors/marketEnabled";
import { officeResourceSurplus } from "Selectors/officeResourceSurplus";
import { mineralId } from "Selectors/roomCache";
import { roomPlans } from "Selectors/roomPlans";

// TODO - We need to track replacement missions more atomically.
// We can give missions a unique ID, which can feed the creep name as well.
// Then we can track the replacement as part of the mission data so it doesn't get replaced twice.

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const mineral = byId(mineralId(office))!;
    const surplus = officeResourceSurplus(office).get(mineral.mineralType) ?? 0;

    if (!marketEnabled() && surplus > 0) return; // don't need to harvest more currently

    const foremanMissions: MineForemanMission[] = [];
    const haulerMissions: MineHaulerMission[] = [];
    for (const mission of pendingAndActiveMissions(office)) {
      if (isMission(MissionType.MINE_FOREMAN)(mission)) {
        foremanMissions.push(mission);
      } else if (isMission(MissionType.MINE_HAULER)(mission)) {
        haulerMissions.push(mission);
      }
    }

    if (mineral) {
      if (!mineral.ticksToRegeneration && roomPlans(office)?.mine?.extractor.structure && !foremanMissions.length) {
        submitMission(office, createMineForemanMission(office, mineral.id));
      }
      if ((roomPlans(office)?.mine?.container.structure as StructureContainer|undefined)?.store.getUsedCapacity() && !haulerMissions.length) {
        submitMission(office, createMineHaulerMission(office, mineral.id));
      }
    }
  }
}
