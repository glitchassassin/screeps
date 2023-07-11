import { initializeOfficeMissions } from 'Missions/initializeOfficeMissions';
import { getSpawns } from 'Selectors/roomPlans';
import { MISSION_HISTORY_LIMIT } from 'config';
import { MissionImplementation, allMissions } from './MissionImplementation';

export function runMissions() {
  initializeOfficeMissions();
  // resetDebugCPU(true);
  for (const mission of allMissions()) {
    try {
      mission.execute();
    } catch (e) {
      console.log(`Error in mission ${mission.constructor.name} in room ${mission.missionData.office}: ${e}`);
    }
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
    try {
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
    } catch (e) {
      console.log(`Error spawning for mission ${mission.constructor.name} in room ${mission.missionData.office}: ${e}`);
    }
    // debugCPU("spawning " + mission.constructor.name);
  }
  return orders;
}
