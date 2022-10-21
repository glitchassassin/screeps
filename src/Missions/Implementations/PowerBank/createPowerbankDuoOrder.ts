import { MinionBuilders } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, MissionType } from 'Missions/Mission';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { PowerBankDuoRoles } from '.';

export function createPowerBankDuoOrder(
  office: string,
  role: PowerBankDuoRoles,
  duoSpeed: number,
  squad: string,
  priority: number
): SpawnOrder {
  const body = MinionBuilders[role](spawnEnergyAvailable(office), duoSpeed);

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: 0
  };

  const mission = createMission({
    office,
    priority,
    type: MissionType.POWER_BANK,
    data: { role },
    estimate
  });

  const name = `${role}-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body,
    memory: { squad }
  });
}
