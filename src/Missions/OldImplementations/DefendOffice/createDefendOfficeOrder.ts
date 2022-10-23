import { MinionBuilders } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, MissionType } from 'Missions/Mission';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { DefendOfficeRoles } from '.';

export function createDefendOfficeOrder(office: string, role: DefendOfficeRoles, squad: string): SpawnOrder {
  const body = MinionBuilders[role](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: 0
  };

  const mission = createMission({
    office,
    priority: 15,
    type: MissionType.DEFEND_OFFICE,
    data: { role },
    estimate
  });

  const name = `JANITOR-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body,
    memory: { squad }
  });
}
