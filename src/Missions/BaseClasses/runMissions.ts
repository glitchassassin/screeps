import { MISSION_HISTORY_LIMIT } from 'config';
import { initializeOfficeMissions } from 'Missions/initializeOfficeMissions';
import { getSpawns } from 'Selectors/roomPlans';
import { allMissions, MissionImplementation } from './MissionImplementation';

export function runMissions() {
  initializeOfficeMissions();
  // debugCPU('Initializing missions');
  for (const mission of allMissions()) {
    mission.execute();
    // debugCPU(mission.constructor.name);
  }
  Memory.missionReports ??= [];
  Memory.missionReports = Memory.missionReports.filter(r => r.finished > Game.time - MISSION_HISTORY_LIMIT);
}

export function spawnMissions() {
  const orders: Record<
    string,
    {
      orders: ReturnType<MissionImplementation['spawn']>;
      energyAllocated: number;
      cpuAllocated: number;
    }
  > = {};
  const officesToSpawn = Object.keys(Memory.offices).filter(o => getSpawns(o).some(s => s && !s.spawning));
  for (const mission of allMissions()) {
    orders[mission.missionData.office] ??= {
      orders: [],
      energyAllocated: 0,
      cpuAllocated: 0
    };
    if (officesToSpawn.includes(mission.missionData.office)) {
      for (const order of mission.spawn()) {
        orders[order.office].orders.push(order);
      }
    }
    orders[mission.missionData.office].cpuAllocated += mission.cpuRemaining();
    orders[mission.missionData.office].energyAllocated += mission.energyRemaining();
  }
  return orders;
}
