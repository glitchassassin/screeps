import { sourceIds } from "Selectors/roomCache";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { Missions } from "./Implementations";
import { createHarvestMission, HarvestMission } from "./Implementations/Harvest";
import { Mission, MissionStatus, MissionType } from "./Mission";

declare global {
  interface OfficeMemory {
    pendingMissions: Mission<MissionType, any>[],
    activeMissions: Mission<MissionType, any>[],
  }
}

export function runMissionControl() {
  generateMissions();
  allocateMissions();
  executeMissions();
}

function executeMissions() {
  for (const office in Memory.offices) {
    // console.log('pending', office, Memory.offices[office].pendingMissions.map(m => m.type));
    // console.log('active', office, Memory.offices[office].activeMissions.map(m => m.type));
    for (const mission of Memory.offices[office].activeMissions) {
      const startTime = Game.cpu.getUsed();
      // console.log('Executing mission', JSON.stringify(mission));
      Missions[mission.type].spawn(mission);
      Missions[mission.type].run(mission);
      mission.actual.cpu += Game.cpu.getUsed() - startTime;
    }
    // Clean up completed missions
    Memory.offices[office].activeMissions.filter(m => m.status === MissionStatus.DONE).forEach(mission =>
      console.log(
        'DONE:',
        mission.office,
        mission.type,
        `${mission.actual.cpu.toFixed(2)}/${mission.estimate.cpu.toFixed(2)}`,
        `${mission.actual.energy}/${mission.estimate.energy}`,
      )
    )
    Memory.offices[office].activeMissions = Memory.offices[office].activeMissions.filter(m => m.status !== MissionStatus.DONE);
  }
}

function generateMissions() {
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
}

function allocateMissions() {
  // Calculate already-allocated resources
  let cpuPerOffice = Game.cpu.bucket / Object.keys(Memory.offices).length;
  for (const office in Memory.offices) {
    let remainingCpu = Memory.offices[office].activeMissions
      .reduce((remaining, mission) =>
        remaining -= (mission.estimate.energy - mission.actual.energy),
        cpuPerOffice
      );
    let remainingEnergy = Memory.offices[office].activeMissions
      .reduce((remaining, mission) =>
        remaining -= (mission.estimate.energy - mission.actual.energy),
        storageEnergyAvailable(office)
      )
    // console.log(office, 'cpu', remainingCpu, 'energy', remainingEnergy)
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
        mission.status = mission.startTime && mission.startTime !== Game.time ? MissionStatus.SCHEDULED : MissionStatus.STARTING;
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
