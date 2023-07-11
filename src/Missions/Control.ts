import { registerCreeps, spawnOrder, SpawnOrder, vacateSpawns } from 'Minions/spawnQueues';
import { recordMissionCpu } from 'Selectors/cpuOverhead';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';
import { updateMissionEnergyAvailable } from 'Selectors/Missions/updateMissionEnergyAvailable';
import { getSpawns } from 'Selectors/roomPlans';
import { allocatedResources, runMissions } from './BaseClasses/runMissions';
import { activeMissions } from './Selectors';

export function runMissionControl() {
  const before = Game.cpu.getUsed();
  updateMissionEnergyAvailable();
  registerCreeps();
  runMissions();
  recordMissionCpu(Math.max(0, Game.cpu.getUsed() - before));
  allocateMissions();
  vacateSpawns();
}

export const spawnRequests = new Map<string, SpawnOrder[]>();

function allocateMissions() {
  const orders = allocatedResources();

  // Calculate already-allocated resources
  for (const office in Memory.offices) {
    // Should have no more STARTING missions than active spawns
    let availableSpawns = getSpawns(office).filter(s => !s.spawning).length;
    if (!availableSpawns) continue;

    const remaining = {
      cpu: missionCpuAvailable(office) - (orders[office]?.cpuAllocated ?? 0),
      energy: MissionEnergyAvailable[office] ?? 0
    };

    // get missions by office
    const missionsByPriority = activeMissions(office).sort((a, b) => b.priority - a.priority)
    const requests = [];

    // loop through priorities, highest to lowest
    let lastPriority = 0;
    let waitForEnergy = false;
    missions: for (const mission of missionsByPriority) {
      // attempt other missions with the same priority, but if a higher-priority
      // mission is waiting for cpu/energy, don't try to spawn lower-priority missions
      if (mission.priority !== lastPriority && waitForEnergy) break missions;
      lastPriority = mission.priority;

      try {
        for (const order of mission.spawn()) {
          if (!availableSpawns) break missions;
          if (remaining.cpu <= 0) break missions;
          // Mission can start
          requests.push(order);
          const result = spawnOrder(office, order, remaining);
          if (result) {
            if (!result.spawned) {
              waitForEnergy = true; // valid build, wait for energy
            }
            availableSpawns -= 1;
            remaining.cpu -= result.estimate.cpu;
            remaining.energy -= result.estimate.energy;
          }
        }
      } catch (e) {
        console.log(`Error spawning for mission ${mission.constructor.name} in room ${mission.missionData.office}: ${e}`);
      }
    }

    spawnRequests.set(office, requests);
  }
}
