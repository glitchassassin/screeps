import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createHarvestMission, HarvestMission } from "Missions/Implementations/Harvest";
import { createReserveMission } from "Missions/Implementations/Reserve";
import { MissionStatus, MissionType } from "Missions/Mission";
import { activeMissions, and, isMission, not, pendingAndActiveMissions, pendingMissions, submitMission } from "Missions/Selectors";
import { byId } from "Selectors/byId";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { adjacentWalkablePositions } from "Selectors/Map/MapCoordinates";
import { posById } from "Selectors/posById";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
// import { logCpu, logCpuStart } from "utils/logCPU";

// TODO - We need to track replacement missions more atomically.
// We can give missions a unique ID, which can feed the creep name as well.
// Then we can track the replacement as part of the mission data so it doesn't get replaced twice.

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // If storage is at least half full, don't worry about spawning more harvesters
    if (storageEnergyAvailable(office) > (STORAGE_CAPACITY / 2)) return;
    // logCpuStart()
    const franchises = franchisesByOffice(office);
    // logCpu('get franchises')

    const shouldReserve = MinionBuilders[MinionTypes.MARKETER](Game.rooms[office].energyCapacityAvailable).length > 0

    const activeMissionsBySource = activeMissions(office).reduce(
      (missions, mission) => {
        if (isMission(MissionType.HARVEST)(mission)) {
          missions[mission.data.source] ??= [];
          missions[mission.data.source].push(mission);
        }
        return missions;
      },
      {} as Record<Id<Source>, HarvestMission[]>
    )
    const pendingMissionsBySource = pendingMissions(office).reduce(
      (missions, mission) => {
        if (isMission(MissionType.HARVEST)(mission)) {
          missions[mission.data.source] ??= [];
          missions[mission.data.source].push(mission);
        }
        return missions;
      },
      {} as Record<Id<Source>, HarvestMission[]>
    )
    // logCpu('sort franchise missions')

    const workPartsPerHarvester = MinionBuilders[MinionTypes.SALESMAN](Game.rooms[office].energyCapacityAvailable)
      .filter(p => p === WORK).length;


    // Create new harvest mission for source, if it doesn't exist
    for (const {source, remote} of franchises) {
      const sourcePos = posById(source);
      if (!sourcePos) continue;

      // generate reserver, if needed
      if (shouldReserve && !pendingAndActiveMissions(office).filter(isMission(MissionType.RESERVE)).some(m => m.data.reserveTarget === sourcePos.roomName)) {
        submitMission(office, createReserveMission(office, sourcePos.roomName));
      }

      if (Memory.rooms[sourcePos.roomName]?.reserver && Memory.rooms[sourcePos.roomName]?.reserver !== 'LordGreywether') {
        // room is reserved by hostile, ignore
        continue;
      }
      const maxMissions = adjacentWalkablePositions(sourcePos, true).length
      const ticksToLive = (name: string) => Game.creeps[name]?.ticksToLive ?? 0;
      // sort active missions by ticks to live, so we only schedule spawns for the youngest
      const activeMissions = activeMissionsBySource[source] ?? [];
      const pendingMissions = pendingMissionsBySource[source] ?? [];

      // recalculate pending missions estimate, if needed
      pendingMissions.forEach(m => {
        if (m.estimate.energy > spawnEnergyAvailable(m.office)) {
          console.log('re-estimating harvest mission', m.office)
          m.estimate = createHarvestMission(m.office, m.data.source, m.startTime).estimate;
        }
      })

      const maxHarvestPower = Math.min(
        (workPartsPerHarvester * maxMissions * HARVEST_POWER),
        (byId(source)?.energyCapacity ?? SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME
      )
      const immediateMissions = [
        ...activeMissions.filter(m => m.status !== MissionStatus.SCHEDULED),
        ...pendingMissions.filter(m => !Boolean(m.startTime))
      ]
      let scheduledMissions = [
        ...activeMissions.filter(m => m.status === MissionStatus.SCHEDULED),
        ...pendingMissions.filter(m => Boolean(m.startTime))
      ]
      let actualHarvestPower = immediateMissions.reduce((sum, m) => sum + m.data.harvestRate, 0);
      // logCpu('analyzing existing missions')

      // if (!remote) console.log(office, remote, source, maxHarvestPower, actualHarvestPower);

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
          submitMission(office, mission);
        }
      }
      // logCpu('checking to reschedule mission')

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
            submitMission(office, newMission);
          }
        }
      }
      // logCpu('scheduling mission')
    }

    // Clean up any pending missions that don't belong to a franchise
    Memory.offices[office].pendingMissions = pendingMissions(office).filter(
      not(and(
        isMission(MissionType.HARVEST),
        m => !franchises.some(f => f.source === (m as HarvestMission).data.source)
      ))
    );
  }
}
