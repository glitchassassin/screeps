import { initializeOfficeMissions } from 'Missions/initializeOfficeMissions';
import { MISSION_HISTORY_LIMIT } from 'config';
import { debugCPU, resetDebugCPU } from 'utils/debugCPU';
import { allMissions } from './MissionImplementation';

export function runMissions() {
  initializeOfficeMissions();
  resetDebugCPU(true);
  for (const mission of allMissions()) {
    try {
      mission.execute();
    } catch (e) {
      console.log(`Error in mission ${mission.constructor.name} in room ${mission.missionData.office}: ${e}`);
    }
    debugCPU(mission.constructor.name);
  }
  // debugCPU('runMissions');
  Memory.missionReports ??= [];
  Memory.missionReports = Memory.missionReports.filter(r => r.finished > Game.time - MISSION_HISTORY_LIMIT);
}

export function spawnMissions() {
  const orders: Record<
    string,
    {
      energyAllocated: number;
      cpuAllocated: number;
    }
  > = {};
  for (const mission of allMissions()) {
      orders[mission.missionData.office] ??= {
        energyAllocated: 0,
        cpuAllocated: 0
      };
      orders[mission.missionData.office].cpuAllocated += mission.cpuRemaining();
      orders[mission.missionData.office].energyAllocated += mission.energyRemaining();
  }
  return orders;
}
