import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createHarvestMission, HarvestMission } from "Missions/Implementations/Harvest";
import { MissionType } from "Missions/Mission";
import { sourceIds } from "Selectors/roomCache";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // Create new harvest mission for source, if it doesn't exist
    const missionCount = Math.max(1, Math.ceil(
      5 / MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(office))
        .filter(p => p === WORK)
        .length
    ));

    for (const source of sourceIds(office)) {
      const activeMissions = Memory.offices[office].activeMissions.filter(m =>
        m.type === MissionType.HARVEST &&
        (m as HarvestMission).data.source === source
      ) as HarvestMission[];
      const pendingMissions = Memory.offices[office].pendingMissions.filter(m =>
        m.type === MissionType.HARVEST &&
        (m as HarvestMission).data.source === source
      ) as HarvestMission[];
      let missionsToSchedule = missionCount - pendingMissions.length;

      // If we have enough missions pending, don't generate more
      if (missionsToSchedule <= 0) continue;

      // Otherwise, if we have enough active missions, schedule replacements for
      // any that have arrived
      if (activeMissions.length >= missionCount) {
        for (let i = pendingMissions.length; i < activeMissions.length; i++) {
          if (missionsToSchedule <= 0) break;
          const mission = activeMissions[i];
          if (mission.data.arrived) {
            const lifetime = Game.creeps[mission.creepNames[0]]?.ticksToLive;
            const scheduleTime = lifetime ?
              Game.time + (lifetime - mission.data.arrived) :
              undefined; // Creep is dead, we need a new one now
            console.log(mission.data.arrived, lifetime, scheduleTime);
            const newMission = createHarvestMission(office, source, scheduleTime);
            console.log('scheduling mission', JSON.stringify(newMission));
            Memory.offices[office].pendingMissions.push(newMission);
          }
          missionsToSchedule -= 1;
        }
      }

      // If we have enough missions pending, don't generate more
      if (missionsToSchedule <= 0) continue;

      for (let i = 0; i < missionsToSchedule; i++) {
        const mission = createHarvestMission(office, source);
        console.log('mission', JSON.stringify(mission));
        Memory.offices[office].pendingMissions.push(mission);
      }
    }
  }
}
