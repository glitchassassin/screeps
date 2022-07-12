import { recordMissionCpu } from "Selectors/cpuOverhead";
import { missionCpuAvailable } from "Selectors/missionCpuAvailable";
import { missionEnergyAvailable } from "Selectors/missionEnergyAvailable";
import { getSpawns, roomPlans } from "Selectors/roomPlans";
import { debugCPU } from "utils/debugCPU";
import { getBudgetAdjustment } from "./Budgets";
import { Dispatchers } from "./Controllers";
import { Missions } from "./Implementations";
import { Mission, MissionStatus, MissionType } from "./Mission";

declare global {
  interface OfficeMemory {
    pendingMissions: Mission<MissionType>[],
    activeMissions: Mission<MissionType>[],
    missionResults: Partial<Record<MissionType, { estimate: { cpu: number, energy: number }, actual: { cpu: number, energy: number } }[]>>
  }

  namespace NodeJS {
    interface Global {
      resetMissions: (office: string) => void
      resetPendingMissions: (office: string) => void
    }
  }
}

global.resetMissions = (office: string, missionType?: MissionType) => {
  Memory.offices[office].activeMissions.forEach(m => {
    if (missionType && m.type !== missionType) return;
    m.creepNames.forEach(n => Game.creeps[n]?.suicide())
  });
  Memory.offices[office].activeMissions = Memory.offices[office].activeMissions.filter(m => missionType && m.type !== missionType);
  Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m => missionType && m.type !== missionType);
}
global.resetPendingMissions = (office: string) => {
  Memory.offices[office].pendingMissions = [];
}

const MISSION_HISTORY_LIMIT = 50;

export function runMissionControl() {
  generateMissions();
  debugCPU('generateMissions', true);
  allocateMissions();
  debugCPU('allocateMissions', true);
  const before = Game.cpu.getUsed();
  executeMissions();
  recordMissionCpu(Math.max(0, Game.cpu.getUsed() - before));
  debugCPU('executeMissions', true);
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
      // Adjust for random negative values of getUsed
      mission.actual.cpu += Math.max(0, Game.cpu.getUsed() - startTime);
    }
    // Clean up completed missions
    Memory.offices[office].activeMissions.filter(m => m.status === MissionStatus.DONE && m.actual.energy).forEach(mission => {
      Memory.offices[office].missionResults ??= {};
      Memory.offices[office].missionResults[mission.type] ??= [];
      Memory.offices[office].missionResults[mission.type]?.unshift({
        estimate: mission.estimate,
        actual: mission.actual,
      })
      Memory.offices[office].missionResults[mission.type] = Memory.offices[office].missionResults[mission.type]!.slice(0, MISSION_HISTORY_LIMIT)
    })
    Memory.offices[office].activeMissions = Memory.offices[office].activeMissions.filter(m => m.status !== MissionStatus.DONE);
  }
}

function generateMissions() {
  // Run per-tick dispatchers
  for (const dispatcher of Dispatchers) {
    dispatcher.byTick();
  }
  // Run per-office dispatchers
  for (const office in Memory.offices) {
    for (const dispatcher of Dispatchers) {
      dispatcher.byOffice(office);
      // debugCPU('dispatcher' + Dispatchers.indexOf(dispatcher), true);
    }
  }
}

function allocateMissions() {
  // Calculate already-allocated resources
  for (const office in Memory.offices) {
    // Should have no more STARTING missions than active spawns
    let startingMissions = Memory.offices[office].activeMissions.filter(m => m.status === MissionStatus.STARTING).length;
    if (startingMissions >= getSpawns(office).length) continue;

    const hasStorage = Boolean(roomPlans(office)?.headquarters?.storage.structure);
    let remainingCpu = Memory.offices[office].activeMissions
      .reduce((remaining, mission) =>
        remaining -= Math.max(0, mission.estimate.cpu - mission.actual.cpu),
        missionCpuAvailable(office)
      );
    let remainingEnergy = Memory.offices[office].activeMissions
      .reduce((remaining, mission) =>
        remaining -= Math.max(0, mission.estimate.energy - mission.actual.energy),
        missionEnergyAvailable(office)
      )
    // if (office === 'W7N3') console.log(office, 'cpu', remainingCpu, 'energy', remainingEnergy)
    const priorities = [...new Set(Memory.offices[office].pendingMissions.map(o => o.priority))].sort((a, b) => b - a);

    // loop through priorities, highest to lowest
    for (const priority of priorities) {
      if (startingMissions >= getSpawns(office).length) break;
      if (remainingCpu <= 0 || remainingEnergy <= 0) break; // No more available resources

      const missions = Memory.offices[office].pendingMissions.filter(o => o.priority === priority);
      const scheduledStartWindow = hasStorage ? Game.time + CREEP_LIFE_TIME : Game.time;
      const sortedMissions = [
        ...missions.filter(o => o.startTime && o.startTime <= scheduledStartWindow),
        ...missions.filter(o => o.startTime === undefined)
      ];

      let startFailures = '';
      // Handles scheduled missions first
      while (sortedMissions.length) {
        if (startingMissions >= getSpawns(office).length) break;
        const mission = sortedMissions.shift();
        if (!mission) break;
        const adjustedBudget = getBudgetAdjustment(mission);
        const canStart = mission.estimate.cpu < (remainingCpu - adjustedBudget.cpu) && mission.estimate.energy < (remainingEnergy - adjustedBudget.energy);
        if (!canStart) {
          if (mission.startTime && mission.startTime <= Game.time) {
            mission.startTime = undefined; // Missed start time, if defined
          }
          startFailures += `${mission.type}:${mission.priority.toFixed(2)} `
          startFailures += `cpu: ${mission.estimate.cpu}/(${remainingCpu} - ${adjustedBudget.cpu} = ${remainingCpu - adjustedBudget.cpu})`
          startFailures += `energy: ${mission.estimate.energy}/(${remainingEnergy} - ${adjustedBudget.energy} = ${remainingEnergy - adjustedBudget.energy})`
          startFailures += `\n`;
          continue;
        }
        // Mission can start
        Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m => m !== mission)
        Memory.offices[office].activeMissions.push(mission);
        startingMissions += 1;
        // Update mission status and remaining budgets
        mission.status = mission.startTime && mission.startTime !== Game.time ? MissionStatus.SCHEDULED : MissionStatus.STARTING;
        remainingCpu -= mission.estimate.cpu;
        remainingEnergy -= mission.estimate.energy;
      }

      // if (office === 'W7S8') {
      //   if (Memory.offices[office].pendingMissions.some(o => o.priority === priority && !o.startTime)) {
      //     console.log(startFailures);
      //     console.log('Unscheduled missions for priority', priority, 'continuing to next priority anyway');
      //   } else {
      //     console.log('priority', priority, 'done');
      //   }
      // }
    }
  }
}
