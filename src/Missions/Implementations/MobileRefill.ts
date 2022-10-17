import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface MobileRefillMission extends Mission<MissionType.MOBILE_REFILL> {
  data: {
    capacity: number;
    depositTarget?: Id<AnyStoreStructure | Creep>;
    repair?: boolean;
  };
}

export function createMobileRefillOrder(office: string, priority = 11): SpawnOrder {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, true);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.8,
    energy: 0
  };

  const mission = createMission({
    office,
    priority,
    type: MissionType.MOBILE_REFILL,
    data: {
      capacity
    },
    estimate
  });

  // Set name
  const name = `MOBILE_REFILL-${mission.office}-${mission.id}`;

  mission.data.capacity ??= body.filter(p => p === CARRY).length * CARRY_CAPACITY;
  mission.data.repair = false;

  return createSpawnOrder(mission, {
    name,
    body
  });
}

export class MobileRefill extends MissionImplementation {
  static minionLogic(mission: MobileRefillMission, creep: Creep): void {
    runStates(
      {
        [States.DEPOSIT]: deposit,
        [States.WITHDRAW]: withdraw,
        [States.RECYCLE]: recycle
      },
      mission,
      creep
    );
  }
}

function selectMobileRefillTarget(creep: Creep, mission: MobileRefillMission) {}
