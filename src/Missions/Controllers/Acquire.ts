import { createAcquireEngineerMission } from "Missions/Implementations/AcquireEngineer";
import { createAcquireLawyerMission } from "Missions/Implementations/AcquireLawyer";
import { createAcquireLogisticsMission } from "Missions/Implementations/AcquireLogistics";
import { MissionType } from "Missions/Mission";
import { isMission, not, or, pendingAndActiveMissions, pendingMissions, submitMission } from "Missions/Selectors";
import { findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";
import { roomPlans } from "Selectors/roomPlans";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const target = findAcquireTarget();
    if (target && officeShouldClaimAcquireTarget(office)) {
      // Generate one claim mission
      if (!pendingAndActiveMissions(office).some(isMission(MissionType.ACQUIRE_LAWYER))) {
        const mission = createAcquireLawyerMission(office, target);
        submitMission(office, mission);
      }
    } else if (target && officeShouldSupportAcquireTarget(office)) {
      // Keep Engineer mission pending
      if (!pendingMissions(office).some(isMission(MissionType.ACQUIRE_ENGINEER))) {
        submitMission(office, createAcquireEngineerMission(office, target));
      }
      // Keep Logistics mission pending, if there's a spawn
      const spawn = roomPlans(target)?.headquarters?.spawn.structure;
      if (spawn && !pendingMissions(office).some(isMission(MissionType.ACQUIRE_LOGISTICS))) {
        submitMission(office, createAcquireLogisticsMission(office, target));
      }
    } else {
      // Clear any pending missions
      Memory.offices[office].pendingMissions = pendingMissions(office)
        .filter(not(or(
          isMission(MissionType.ACQUIRE_LAWYER),
          isMission(MissionType.ACQUIRE_ENGINEER),
          isMission(MissionType.ACQUIRE_LOGISTICS)
        )))
    }
  }
}
