import { MISSION_HISTORY_LIMIT } from 'config';
import { spawnOrder, SpawnOrder, vacateSpawns } from 'Minions/spawnQueues';
import { recordMissionCpu } from 'Selectors/cpuOverhead';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { missionEnergyAvailable } from 'Selectors/missionEnergyAvailable';
import { getSpawns } from 'Selectors/roomPlans';
import { debugCPU } from 'utils/debugCPU';
import { getBudgetAdjustment } from './Budgets';
import { Dispatchers } from './Controllers';
import { Missions } from './Implementations';
import { MissionStatus, MissionType } from './Mission';
import { activeCreeps, activeMissions, initializeCreepIndex, isStatus, not, registerSpawningCreeps } from './Selectors';
import { getSquadMission } from './Squads/getSquadMission';

const DEBUG_CPU = false;

declare global {
  interface OfficeMemory {
    missionResults: Partial<
      Record<
        MissionType,
        {
          efficiency: number;
          estimate: { cpu: number; energy: number };
          actual: { cpu: number; energy: number };
          completed: number;
        }[]
      >
    >;
  }
}

export function runMissionControl() {
  initializeCreepIndex();
  registerSpawningCreeps();
  vacateSpawns();
  const before = Game.cpu.getUsed();
  executeMissions();
  recordMissionCpu(Math.max(0, Game.cpu.getUsed() - before));
  debugCPU('executeMissions', true);
  allocateMissions();
  debugCPU('allocateMissions', true);
}

function executeMissions() {
  for (const office in Memory.offices) {
    if (DEBUG_CPU) console.log('-=<', office, 'missions >=-');
    Memory.offices[office].squadMissions ??= [];
    // console.log('pending', office, Memory.offices[office].pendingMissions.map(m => m.type));
    // console.log('active', office, Memory.offices[office].activeMissions.map(m => m.type));
    for (const creep of activeCreeps(office)) {
      const startTime = Game.cpu.getUsed();
      const mission = Memory.creeps[creep].mission;
      if (!mission) {
        Game.creeps[creep]?.suicide();
        console.log('suiciding', creep, 'which has no mission');
      }
      try {
        // console.log('Executing mission', mission.office, mission.type);
        Missions[mission.type].run(mission, Game.creeps[creep]);
        // Adjust for random negative values of getUsed
      } catch (e) {
        console.log('Error running', mission.type, 'for', office);
        console.log(e);
        throw e;
      }
      const cpuUsed = Math.max(0, Game.cpu.getUsed() - startTime);
      mission.actual.cpu += cpuUsed;
      if (DEBUG_CPU) console.log(mission.type, cpuUsed.toFixed(2), Game.creeps[creep]?.pos);
    }
    // Run squad missions
    for (const mission of Memory.offices[office].squadMissions) {
      getSquadMission(mission).run();
    }
    // Clean up completed missions/creep memory
    Memory.offices[office].squadMissions = Memory.offices[office].squadMissions.filter(
      not(isStatus(MissionStatus.DONE))
    );
    for (const creepName in Memory.creeps) {
      if (creepName in Game.creeps) continue;
      const mission = Memory.creeps[creepName].mission;
      if (mission?.type) {
        Memory.offices[office].missionResults ??= {};
        Memory.offices[office].missionResults[mission.type] ??= [];
        Memory.offices[office].missionResults[mission.type]?.unshift({
          estimate: mission.estimate,
          actual: mission.actual,
          efficiency: mission.efficiency.working / mission.efficiency.running,
          completed: Game.time
        });
      }
      delete Memory.creeps[creepName];
    }
    for (const type in Memory.offices[office].missionResults) {
      Memory.offices[office].missionResults[type as MissionType] = Memory.offices[office].missionResults[
        type as MissionType
      ]!.filter(r => r.completed && r.completed > Game.time - MISSION_HISTORY_LIMIT);
    }
  }
}

export const spawnRequests = new Map<string, SpawnOrder[]>();

function allocateMissions() {
  // Calculate already-allocated resources
  for (const office in Memory.offices) {
    // Should have no more STARTING missions than active spawns
    let availableSpawns = getSpawns(office).filter(s => !s.spawning).length;
    if (!availableSpawns) continue;

    const requests: SpawnOrder[] = [];
    for (const dispatcher of Dispatchers) {
      requests.push(...dispatcher.byOffice(office).filter(o => o.data.body.length > 0));
    }
    spawnRequests.set(office, requests);

    let remainingCpu = Math.max(
      0,
      activeMissions(office).reduce(
        (remaining, mission) => (remaining -= Math.max(0, mission.estimate.cpu - mission.actual.cpu)),
        missionCpuAvailable(office)
      )
    );
    let remainingEnergy = activeMissions(office).reduce(
      (remaining, mission) => (remaining -= Math.max(0, mission.estimate.energy - mission.actual.energy)),
      missionEnergyAvailable(office)
    );
    const priorities = [...new Set(requests.map(o => o.mission.priority))].sort((a, b) => b - a);

    // loop through priorities, highest to lowest
    for (const priority of priorities) {
      if (!availableSpawns) break;

      const missions = requests.filter(o => o.mission.priority === priority);

      let startFailures = '';
      // Handles scheduled missions first
      while (missions.length) {
        if (!availableSpawns) break;
        if (remainingCpu < 0) break;
        const order = missions.shift();
        if (!order) break;
        const adjustedBudget = getBudgetAdjustment(order.mission);
        const canStart =
          order.mission.estimate.cpu <= remainingCpu - adjustedBudget.cpu &&
          order.mission.estimate.energy <= remainingEnergy - adjustedBudget.energy;
        if (!canStart) {
          startFailures += `${order.mission.type}:${order.mission.priority.toFixed(2)} `;
          startFailures += `cpu: ${order.mission.estimate.cpu}/(${remainingCpu} - ${adjustedBudget.cpu} = ${
            remainingCpu - adjustedBudget.cpu
          })`;
          startFailures += `energy: ${order.mission.estimate.energy}/(${remainingEnergy} - ${adjustedBudget.energy} = ${
            remainingEnergy - adjustedBudget.energy
          })`;
          startFailures += `\n`;
          continue;
        }
        // Mission can start
        if (spawnOrder(office, order)) {
          availableSpawns -= 1;
          remainingCpu -= order.mission.estimate.cpu;
          remainingEnergy -= order.mission.estimate.energy;
        }
      }
      // if (startFailures && office === 'W2N5') console.log(startFailures);
    }
  }
}
