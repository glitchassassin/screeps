import { deposit } from 'Behaviors/Logistics/deposit';
import { findDeposit } from 'Behaviors/Logistics/findDeposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { withdrawFromStorage } from 'Behaviors/Logistics/withdrawFromStorage';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { minionCost } from 'Selectors/minionCostPerTick';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface MobileRefillMission extends Mission<MissionType.MOBILE_REFILL> {
  data: {
    capacity: number;
    depositTarget?: Id<AnyStoreStructure | Creep>;
    repair?: boolean;
  };
}

export function createMobileRefillMission(office: string, priority = 11): MobileRefillMission {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, true);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.8,
    energy: minionCost(body)
  };

  return createMission({
    office,
    priority,
    type: MissionType.MOBILE_REFILL,
    data: {
      capacity
    },
    estimate
  });
}

export class MobileRefill extends MissionImplementation {
  static spawn(mission: MobileRefillMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion;

    const body = MinionBuilders[MinionTypes.ACCOUNTANT](
      Math.min(1050, spawnEnergyAvailable(mission.office)),
      50,
      true,
      false
    );

    // Set name
    const name = `MOBILE_REFILL-${mission.office}-${mission.id}`;

    mission.data.capacity ??= body.filter(p => p === CARRY).length * CARRY_CAPACITY;
    mission.data.repair = false;

    scheduleSpawn(mission.office, mission.priority, {
      name,
      body
    });

    mission.creepNames.push(name);
  }

  static minionLogic(mission: MobileRefillMission, creep: Creep): void {
    runStates(
      {
        [States.DEPOSIT]: deposit,
        [States.FIND_DEPOSIT]: findDeposit,
        [States.FIND_WITHDRAW]: withdrawFromStorage,
        [States.WITHDRAW]: withdraw,
        [States.RECYCLE]: recycle
      },
      mission,
      creep
    );
  }
}

function selectMobileRefillTarget(creep: Creep, mission: MobileRefillMission) {}
