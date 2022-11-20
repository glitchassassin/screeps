import { registerCreeps, spawnOrder, SpawnOrder, vacateSpawns } from 'Minions/spawnQueues';
import { recordMissionCpu } from 'Selectors/cpuOverhead';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';
import { updateMissionEnergyAvailable } from 'Selectors/Missions/updateMissionEnergyAvailable';
import { getSpawns } from 'Selectors/roomPlans';
import { debugCPU } from 'utils/debugCPU';
import { runMissions, spawnMissions } from './BaseClasses/runMissions';

export function runMissionControl() {
  const before = Game.cpu.getUsed();
  updateMissionEnergyAvailable();
  registerCreeps();
  executeMissions();
  recordMissionCpu(Math.max(0, Game.cpu.getUsed() - before));
  debugCPU('executeMissions');
  allocateMissions();
  debugCPU('allocateMissions');
  vacateSpawns();
}

function executeMissions() {
  runMissions();
}

export const spawnRequests = new Map<string, SpawnOrder[]>();

function allocateMissions() {
  const orders = spawnMissions();

  // Calculate already-allocated resources
  for (const office in Memory.offices) {
    // Should have no more STARTING missions than active spawns
    let availableSpawns = getSpawns(office).filter(s => !s.spawning).length;
    if (!availableSpawns) continue;

    const requests = orders[office]?.orders ?? [];
    const remaining = {
      cpu: missionCpuAvailable(office) - (orders[office]?.cpuAllocated ?? 0),
      energy: MissionEnergyAvailable[office] ?? 0
    };

    spawnRequests.set(office, requests);
    const priorities = [...new Set(requests.map(o => o.priority))].sort((a, b) => b - a);

    // loop through priorities, highest to lowest
    priorities: for (const priority of priorities) {
      if (!availableSpawns) break;

      const missions = requests.filter(o => o.priority === priority);

      while (missions.length) {
        if (!availableSpawns) break;
        if (remaining.cpu <= 0) break;
        const order = missions.shift();
        if (!order) break;
        // Mission can start
        const result = spawnOrder(office, order, remaining);
        if (result) {
          if (!result.spawned) break priorities; // valid build, wait for energy
          availableSpawns -= 1;
          remaining.cpu -= result.estimate.cpu;
          remaining.energy -= result.estimate.energy;
        }
      }
    }
  }
}
