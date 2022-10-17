import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { franchisesThatNeedRoadWork } from 'Selectors/Franchises/franchisesThatNeedRoadWork';
import { plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { rcl } from 'Selectors/rcl';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { plannedStructureNeedsWork } from 'Selectors/Structures/facilitiesWorkToDo';
import { MissionImplementation } from './MissionImplementation';

export interface LogisticsMission extends Mission<MissionType.LOGISTICS> {
  data: {
    capacity: number;
    lastCapacity?: number;
    lastRan?: number;
    withdrawTarget?: Id<Source>;
    depositTarget?: Id<AnyStoreStructure | Creep>;
    repair?: boolean;
  };
}

export function createLogisticsOrder(office: string, priority = 11): SpawnOrder {
  const roads = rcl(office) > 3 && franchisesThatNeedRoadWork(office).length <= 2;
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  const repair =
    rcl(office) > 3 && plannedTerritoryRoads(office).some(r => r.structure && plannedStructureNeedsWork(r));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.8,
    energy: 0
  };

  const mission = createMission({
    office,
    priority,
    type: MissionType.LOGISTICS,
    data: {
      capacity,
      repair
    },
    estimate
  });

  // Set name
  const name = `ACCOUNTANT-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body
  });
}

export class Logistics extends MissionImplementation {
  static onEnd(mission: LogisticsMission): void {
    LogisticsLedger.record(mission.office, 'death', -(mission.data.lastCapacity ?? 0));
  }

  static minionLogic(mission: LogisticsMission, creep: Creep): void {
    mission.data.lastCapacity = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    mission.data.lastRan = Game.time;

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
