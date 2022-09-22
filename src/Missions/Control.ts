import { MISSION_HISTORY_LIMIT } from 'config';
import { recordMissionCpu } from 'Selectors/cpuOverhead';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { missionEnergyAvailable } from 'Selectors/missionEnergyAvailable';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { debugCPU } from 'utils/debugCPU';
import { getBudgetAdjustment } from './Budgets';
import { Dispatchers } from './Controllers';
import { Missions } from './Implementations';
import { Mission, MissionStatus, MissionType } from './Mission';
import { activeMissions, assignedCreep, isStatus, not, pendingMissions } from './Selectors';

declare global {
  interface OfficeMemory {
    pendingMissions: Mission<MissionType>[];
    activeMissions: Mission<MissionType>[];
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

  namespace NodeJS {
    interface Global {
      resetMissions: (office: string) => void;
      resetPendingMissions: (office: string) => void;
    }
  }
}

global.resetMissions = (office: string, missionType?: MissionType) => {
  activeMissions(office).forEach(m => {
    if (missionType && m.type !== missionType) return;
    assignedCreep(m)?.suicide();
  });
  Memory.offices[office].activeMissions = activeMissions(office).filter(m => missionType && m.type !== missionType);
  Memory.offices[office].pendingMissions = pendingMissions(office).filter(m => missionType && m.type !== missionType);
};
global.resetPendingMissions = (office: string) => {
  Memory.offices[office].pendingMissions = [];
};

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
    for (const mission of activeMissions(office)) {
      const startTime = Game.cpu.getUsed();
      try {
        // console.log('Executing mission', mission.office, mission.type);
        Missions[mission.type].spawn(mission);
        Missions[mission.type].run(mission);
        // Adjust for random negative values of getUsed
      } catch (e) {
        console.log('Error running', mission.type, 'for', office);
        console.log(e);
        throw e;
      }
      mission.actual.cpu += Math.max(0, Game.cpu.getUsed() - startTime);
      debugCPU(mission.type, true);
    }
    // Clean up completed missions
    activeMissions(office)
      .filter(m => isStatus(MissionStatus.DONE)(m) && m.efficiency?.running)
      .forEach(mission => {
        Memory.offices[office].missionResults ??= {};
        Memory.offices[office].missionResults[mission.type] ??= [];
        Memory.offices[office].missionResults[mission.type]?.unshift({
          estimate: mission.estimate,
          actual: mission.actual,
          efficiency: mission.efficiency.working / mission.efficiency.running,
          completed: Game.time
        });
      });
    for (const type in Memory.offices[office].missionResults) {
      Memory.offices[office].missionResults[type as MissionType] = Memory.offices[office].missionResults[
        type as MissionType
      ]!.filter(r => r.completed && r.completed > Game.time - MISSION_HISTORY_LIMIT);
    }
    Memory.offices[office].activeMissions = activeMissions(office).filter(not(isStatus(MissionStatus.DONE)));
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
    const availableSpawns = getSpawns(office).filter(s => !s.spawning).length;
    let startingMissions = activeMissions(office).filter(isStatus(MissionStatus.STARTING)).length;
    if (startingMissions >= availableSpawns) continue;

    const hasStorage = Boolean(roomPlans(office)?.headquarters?.storage.structure);
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
    const priorities = [...new Set(Memory.offices[office].pendingMissions.map(o => o.priority))].sort((a, b) => b - a);

    // loop through priorities, highest to lowest
    for (const priority of priorities) {
      if (startingMissions > availableSpawns) break;

      const missions = Memory.offices[office].pendingMissions.filter(o => o.priority === priority);
      const sortedMissions = [
        ...missions.filter(o => o.startTime && o.startTime <= Game.time),
        ...missions.filter(o => o.startTime === undefined)
      ];

      let startFailures = '';
      // Handles scheduled missions first
      while (sortedMissions.length) {
        if (startingMissions > availableSpawns) break;
        if (remainingCpu < 0) break;
        const mission = sortedMissions.shift();
        if (!mission) break;
        const adjustedBudget = getBudgetAdjustment(mission);
        const canStart =
          mission.estimate.cpu <= remainingCpu - adjustedBudget.cpu &&
          mission.estimate.energy <= remainingEnergy - adjustedBudget.energy;
        if (!canStart) {
          if (mission.startTime && mission.startTime <= Game.time) {
            mission.startTime = undefined; // Missed start time, if defined
          }
          startFailures += `${mission.type}:${mission.priority.toFixed(2)} `;
          startFailures += `cpu: ${mission.estimate.cpu}/(${remainingCpu} - ${adjustedBudget.cpu} = ${
            remainingCpu - adjustedBudget.cpu
          })`;
          startFailures += `energy: ${mission.estimate.energy}/(${remainingEnergy} - ${adjustedBudget.energy} = ${
            remainingEnergy - adjustedBudget.energy
          })`;
          startFailures += `\n`;
          continue;
        }
        // Mission can start
        Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m => m !== mission);
        Memory.offices[office].activeMissions.push(mission);

        startingMissions += 1;
        // Update mission status and remaining budgets
        mission.status =
          mission.startTime && mission.startTime !== Game.time ? MissionStatus.SCHEDULED : MissionStatus.STARTING;
        remainingCpu -= mission.estimate.cpu;
        remainingEnergy -= mission.estimate.energy;
      }

      // if (office === 'W8N3') {
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
