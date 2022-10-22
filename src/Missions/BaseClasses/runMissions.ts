import { allMissions } from './MissionImplementation';

export function runMissions() {
  for (const mission of allMissions()) {
    mission.execute();
  }
}

export function spawnMissions() {
  const orders = [];
  for (const mission of allMissions()) {
    orders.push(...mission.spawn());
  }
  return orders;
}
