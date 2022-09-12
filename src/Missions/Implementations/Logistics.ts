import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
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

export function createLogisticsMission(office: string, priority = 11): LogisticsMission {
  const roads = rcl(office) > 3 && franchisesThatNeedRoadWork(office).length <= 2;
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.8,
    energy: 0
  };

  return createMission({
    office,
    priority,
    type: MissionType.LOGISTICS,
    data: {
      capacity
    },
    estimate
  });
}

export class Logistics extends MissionImplementation {
  static spawn(mission: LogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const roads = rcl(mission.office) > 3 && franchisesThatNeedRoadWork(mission.office).length <= 2;

    const repair =
      rcl(mission.office) > 3 &&
      plannedTerritoryRoads(mission.office).some(r => r.structure && plannedStructureNeedsWork(r));

    const energy = Math.min(
      spawnEnergyAvailable(mission.office),
      Math.max(550, spawnEnergyAvailable(mission.office) / 2)
    );

    const body = MinionBuilders[MinionTypes.ACCOUNTANT](energy, 50, roads, repair);

    // Set name
    const name = `ACCOUNTANT-${mission.office}-${mission.id}`;

    mission.data.capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;
    mission.data.repair = repair;

    scheduleSpawn(mission.office, mission.priority, {
      name,
      body,
      missionId: mission.id
    });

    mission.creepNames.push(name);
  }

  static onEnd(mission: LogisticsMission): void {
    LogisticsLedger.record(mission.office, 'death', -(mission.data.lastCapacity ?? 0));
  }

  static minionLogic(mission: LogisticsMission, creep: Creep): void {
    mission.data.capacity = creep.body.filter(p => p.type === CARRY).length * CARRY_CAPACITY;
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

function selectLogisticsTarget(creep: Creep, mission: LogisticsMission) {}
