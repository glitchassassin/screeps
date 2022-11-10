import { registerCreeps, spawnOrder, SpawnOrder, vacateSpawns } from 'Minions/spawnQueues';
import { recordMissionCpu } from 'Selectors/cpuOverhead';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';
import { updateMissionEnergyAvailable } from 'Selectors/Missions/updateMissionEnergyAvailable';
import { getSpawns } from 'Selectors/roomPlans';
import { debugCPU } from 'utils/debugCPU';
import { runMissions, spawnMissions } from './BaseClasses/runMissions';
import { getBudgetAdjustment } from './Budgets';

export function runMissionControl() {
  const before = Game.cpu.getUsed();
  updateMissionEnergyAvailable();
  registerCreeps();
  executeMissions();
  recordMissionCpu(Math.max(0, Game.cpu.getUsed() - before));
  debugCPU('executeMissions', true);
  allocateMissions();
  debugCPU('allocateMissions', true);
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
    let cpuRemaining = missionCpuAvailable(office) - (orders[office]?.cpuAllocated ?? 0);
    let energyRemaining = MissionEnergyAvailable[office] ?? 0;

    spawnRequests.set(office, requests);
    const priorities = [...new Set(requests.map(o => o.priority))].sort((a, b) => b - a);

    // loop through priorities, highest to lowest
    priorities: for (const priority of priorities) {
      if (!availableSpawns) break;

      const missions = requests.filter(o => o.priority === priority);

      while (missions.length) {
        if (!availableSpawns) break;
        if (cpuRemaining < 0) break;
        const order = missions.shift();
        if (!order) break;
        // console.log(priority, order.name);
        if (!order.body.length) {
          console.log(order.name, 'empty body', order.body.length);
          continue;
        }
        const adjustedBudget = getBudgetAdjustment(order.office, order.budget);
        const canStart = order.estimate.energy <= energyRemaining - adjustedBudget;
        // Mission can start
        if (canStart) {
          const result = spawnOrder(office, order);
          if (result === ERR_NOT_ENOUGH_ENERGY) break priorities; // wait for energy
          if (result === OK) {
            availableSpawns -= 1;
            cpuRemaining -= order.estimate.cpu;
            energyRemaining -= order.estimate.energy;
          }
        }
      }
    }
  }
}
