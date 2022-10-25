import { MISSION_HISTORY_LIMIT } from 'config';
import { initializeOfficeMissions } from 'Missions/initializeOfficeMissions';
import { allMissions, MissionImplementation } from './MissionImplementation';

export function runMissions() {
  initializeOfficeMissions();
  for (const mission of allMissions()) {
    mission.execute();
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
  for (const mission of allMissions()) {
    orders[mission.missionData.office] ??= {
      orders: [],
      energyAllocated: 0,
      cpuAllocated: 0
    };
    for (const order of mission.spawn()) {
      orders[order.office].orders.push(order);
    }
    orders[mission.missionData.office].cpuAllocated += mission.cpuRemaining();
    orders[mission.missionData.office].energyAllocated += mission.energyRemaining();
  }
  return orders;
}
