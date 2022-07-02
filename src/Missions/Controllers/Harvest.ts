import { createHarvestMission, HarvestMission } from "Missions/Implementations/Harvest";
import { MissionStatus, MissionType } from "Missions/Mission";
import { byId } from "Selectors/byId";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { adjacentWalkablePositions } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";

// TODO - We need to track replacement missions more atomically.
// We can give missions a unique ID, which can feed the creep name as well.
// Then we can track the replacement as part of the mission data so it doesn't get replaced twice.

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const franchises = franchisesByOffice(office);

    // Create new harvest mission for source, if it doesn't exist
    for (const {source, remote} of franchises) {
      const ticksToLive = (name: string) => Game.creeps[name]?.ticksToLive ?? 0;
      // sort active missions by ticks to live, so we only schedule spawns for the youngest
      const activeMissions = Memory.offices[office].activeMissions.filter(m =>
        m.type === MissionType.HARVEST &&
        (m as HarvestMission).data.source === source
      ) as HarvestMission[];
      const pendingMissions = Memory.offices[office].pendingMissions.filter(m =>
        m.type === MissionType.HARVEST &&
        (m as HarvestMission).data.source === source
      ) as HarvestMission[];
      const maxPositions = adjacentWalkablePositions(posById(source)!, true).length;
      const maxHarvestPower = (byId(source)?.energyCapacity ?? SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME
      const immediateMissions = [
        ...activeMissions.filter(m => m.status !== MissionStatus.SCHEDULED),
        ...pendingMissions.filter(m => !Boolean(m.startTime))
      ]
      let scheduledMissions = [
        ...activeMissions.filter(m => m.status === MissionStatus.SCHEDULED),
        ...pendingMissions.filter(m => Boolean(m.startTime))
      ]
      let actualHarvestPower = immediateMissions.reduce((sum, m) => sum + m.data.harvestRate, 0);

      // If we need more missions now, try to bring forward a scheduled missions
      if (maxHarvestPower > actualHarvestPower) {
        if (scheduledMissions.length) {
          const scheduledMissionToRun = scheduledMissions.reduce((a, b) => a.startTime! < b.startTime! ? a : b);
          delete scheduledMissionToRun.startTime;
          scheduledMissions = scheduledMissions.filter(m => m !== scheduledMissionToRun);
          immediateMissions.push(scheduledMissionToRun);
          actualHarvestPower += scheduledMissionToRun.data.harvestRate;
        } else {
          const mission = createHarvestMission(office, source);
          Memory.offices[office].pendingMissions.push(mission);
        }
      }

      if (scheduledMissions.length) continue; // no more than one extra scheduled mission

      // No scheduled missions yet - schedule a new one
      if (!remote) {
        for (const mission of activeMissions
          .filter(m => !m.replacement && m.data.arrived)
          .sort((a, b) => ticksToLive(a.creepNames[0]) - ticksToLive(b.creepNames[0]))
        ) {
          actualHarvestPower -= mission.data.harvestRate;
          if (actualHarvestPower < maxHarvestPower) {
            // Losing this minion will drop us past our target harvest power, schedule a replacement
            const lifetime = Game.creeps[mission.creepNames[0]]?.ticksToLive;
            if (!lifetime) continue;
            const scheduleTime = Game.time + (lifetime - mission.data.arrived!);
            const newMission = createHarvestMission(office, source, scheduleTime);
            mission.replacement = newMission.id;
            Memory.offices[office].pendingMissions.push(newMission);
          }
        }
      }
    }

    // Clean up any pending missions that don't belong to a franchise
    Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m =>
      !(
        m.type === MissionType.HARVEST &&
        !franchises.some(f => f.source === (m as HarvestMission).data.source)
      )
    );
  }
}
