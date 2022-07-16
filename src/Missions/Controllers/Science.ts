import { createScienceMission } from "Missions/Implementations/Science";
import { MissionStatus, MissionType } from "Missions/Mission";
import { activeMissions, and, assignedCreep, isMission, isStatus, not, pendingAndActiveMissions, submitMission } from "Missions/Selectors";
import { roomPlans } from "Selectors/roomPlans";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (!roomPlans(office)?.labs?.labs[0].structure) return;
    if (
      Memory.offices[office].lab.orders.length === 0 &&
      Memory.offices[office].lab.boosts.length === 0
    ) return;

    // Maintain one Scientist
    const scheduledMissions = pendingAndActiveMissions(office).some(and(
      isMission(MissionType.SCIENCE),
      not(isStatus(MissionStatus.RUNNING))
    ));
    if (!scheduledMissions) {
      const activeMission = activeMissions(office).find(isMission(MissionType.SCIENCE));
      const startTime = activeMission ?
        Game.time + (assignedCreep(activeMission)?.ticksToLive ?? CREEP_LIFE_TIME) :
        undefined; // no active mission, start immediately
      submitMission(office, createScienceMission(office, startTime));
    }
  }
}
