import { createScienceMission } from "Missions/Implementations/Science";
import { MissionStatus, MissionType } from "Missions/Mission";
import { roomPlans } from "Selectors/roomPlans";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (!roomPlans(office)?.labs?.labs[0].structure) return;

    // Maintain one Scientist
    const scheduledMissions = [
      ...Memory.offices[office].pendingMissions,
      ...Memory.offices[office].activeMissions,
    ].some(m => m.type === MissionType.SCIENCE && m.status !== MissionStatus.RUNNING)
    if (!scheduledMissions) {
      const activeMission = Memory.offices[office].activeMissions.find(m => m.type === MissionType.SCIENCE);
      const startTime = activeMission ?
        Game.time + (Game.creeps[activeMission.creepNames[0]]?.ticksToLive ?? CREEP_LIFE_TIME) :
        undefined; // no active mission, start immediately
      Memory.offices[office].pendingMissions.push(createScienceMission(office, startTime));
    }
  }
}
