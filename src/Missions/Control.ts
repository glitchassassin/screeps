import { sourceIds } from "Selectors/roomCache";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { createHarvestMission, HarvestMission } from "./Implementations/Harvest";
import { Mission, MissionStatus, MissionType } from "./Mission";

declare global {
  interface OfficeMemory {
    pendingMissions: Mission<MissionType, unknown>[],
    activeMissions: Mission<MissionType, unknown>[],
  }
}

export function runMissionControl() {
  for (const office in Memory.offices) {
    // Create new harvest mission for source, if it doesn't exist
    for (const source of sourceIds(office)) {
      if (![
        ...Memory.offices[office].activeMissions,
        ...Memory.offices[office].pendingMissions
      ].some(m =>
        m.type === MissionType.HARVEST &&
        (m as HarvestMission).data.source === source
      )) {
        Memory.offices[office].pendingMissions.push(
          createHarvestMission(office, source)
        )
      }
    }
  }

  // Calculate already-allocated resources
  let cpuPerOffice = Game.cpu.bucket / Object.keys(Memory.offices).length;
  for (const office in Memory.offices) {
    let remainingCpu = Memory.offices[office].activeMissions
      .reduce((remaining, mission) =>
        remaining = (mission.estimate.energy - mission.actual.energy),
        cpuPerOffice
      );
    let remainingEnergy = Memory.offices[office].activeMissions
      .reduce((remaining, mission) =>
        remaining = (mission.estimate.energy - mission.actual.energy),
        storageEnergyAvailable(office)
      )

    const priorities = [...new Set(Memory.offices[office].pendingMissions.map(o => o.priority))].sort((a, b) => b - a);

    // loop through priorities, highest to lowest
    for (const priority of priorities) {
      if (remainingCpu <= 0 || remainingEnergy <= 0) break; // No more available resources

      const missions = Memory.offices[office].pendingMissions.filter(o => o.priority === priority);
      const sortedMissions = [
        ...missions.filter(o => o.startTime && o.startTime <= Game.time + CREEP_LIFE_TIME),
        ...missions.filter(o => o.startTime === undefined)
      ];

      // Handles scheduled missions first
      while (sortedMissions.length) {
        const mission = sortedMissions.shift();
        if (!mission) break;
        const canStart = mission.estimate.cpu < remainingCpu && mission.estimate.energy < remainingEnergy;
        if (!canStart) {
          mission.startTime = undefined; // Missed start time, if defined
          continue;
        }
        // Mission can start
        Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m => m !== mission)
        Memory.offices[office].activeMissions.push(mission);
        // Update mission status and remaining budgets
        mission.status = mission.startTime && mission.startTime !== Game.time ? MissionStatus.SCHEDULED : MissionStatus.RUNNING;
        remainingCpu -= mission.estimate.cpu;
        remainingEnergy -= mission.estimate.energy;
      }

      // If any missions with this priority left, stop assigning to let buckets refill
      if (Memory.offices[office].pendingMissions.some(o => o.priority === priority)) {
        break;
      }
    }
  }
}
