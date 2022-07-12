import { createAcquireEngineerMission } from "Missions/Implementations/AcquireEngineer";
import { createAcquireLawyerMission } from "Missions/Implementations/AcquireLawyer";
import { createAcquireLogisticsMission } from "Missions/Implementations/AcquireLogistics";
import { MissionType } from "Missions/Mission";
import { findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";
import { roomPlans } from "Selectors/roomPlans";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const target = findAcquireTarget();
    if (target && officeShouldClaimAcquireTarget(office)) {
      // Generate one claim mission
      if (![
        ...Memory.offices[office].pendingMissions,
        ...Memory.offices[office].activeMissions
      ].some(m => m.type === MissionType.ACQUIRE_LAWYER)) {
        const mission = createAcquireLawyerMission(office, target);
        Memory.offices[office].pendingMissions.push(mission);
      }
    } else if (target && officeShouldSupportAcquireTarget(office)) {
      // Keep Engineer mission pending
      if (!Memory.offices[office].pendingMissions.some(m => m.type === MissionType.ACQUIRE_ENGINEER)) {
        Memory.offices[office].pendingMissions.push(
          createAcquireEngineerMission(office, target)
        );
      }
      // Keep Logistics mission pending, if there's a spawn
      const spawn = roomPlans(target)?.headquarters?.spawn.structure;
      if (spawn && !Memory.offices[office].pendingMissions.some(m => m.type === MissionType.ACQUIRE_LOGISTICS)) {
        Memory.offices[office].pendingMissions.push(
          createAcquireLogisticsMission(office, target)
        );
      }
    } else {
      // Clear any pending missions
      Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m => m.type !== MissionType.ACQUIRE_LAWYER && m.type !== MissionType.ACQUIRE_ENGINEER && m.type !== MissionType.ACQUIRE_LOGISTICS)
    }
  }
}
