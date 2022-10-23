import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, MissionType } from 'Missions/Mission';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';

export function createPowerbankHaulerOrder(
  office: string,
  squad: string,
  powerbank: Id<StructurePowerBank>,
  powerBankPos: string,
  priority: number
): SpawnOrder {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 25, false, false);

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: 0
  };

  const mission = createMission({
    office,
    priority,
    type: MissionType.POWER_BANK,
    data: { role: MinionTypes.ACCOUNTANT, powerbank, powerBankPos },
    estimate
  });

  const name = `PBH-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body,
    memory: { squad }
  });
}
