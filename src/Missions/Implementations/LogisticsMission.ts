import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { franchisesThatNeedRoadWork } from 'Selectors/Franchises/franchisesThatNeedRoadWork';
import { plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { rcl } from 'Selectors/rcl';
import { plannedStructureNeedsWork } from 'Selectors/Structures/facilitiesWorkToDo';
import { memoizeByTick } from 'utils/memoizeFunction';

export interface LogisticsMissionData extends BaseMissionData {
  withdrawTarget?: Id<Source>;
  depositTarget?: Id<AnyStoreStructure | Creep>;
  repair?: boolean;
}

export class LogisticsMission extends MissionImplementation {
  public creeps = {
    hauler: new CreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.ESSENTIAL,
      body: energy =>
        MinionBuilders[MinionTypes.ACCOUNTANT](energy, 25, this.calculated().roads, this.calculated().repair)
    })
  };

  priority = 10;

  constructor(public missionData: LogisticsMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: LogisticsMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  calculated = memoizeByTick(
    () => '',
    () => {
      return {
        roads: rcl(this.missionData.office) > 3 && franchisesThatNeedRoadWork(this.missionData.office).length <= 2,
        repair:
          rcl(this.missionData.office) > 3 &&
          plannedTerritoryRoads(this.missionData.office).some(r => r.structure && plannedStructureNeedsWork(r))
      };
    }
  );

  run(
    creeps: ResolvedCreeps<LogisticsMission>,
    missions: ResolvedMissions<LogisticsMission>,
    data: LogisticsMissionData
  ) {
    const { hauler } = creeps;

    if (!hauler) return;

    runStates(
      {
        [States.DEPOSIT]: deposit,
        [States.WITHDRAW]: withdraw(false),
        [States.RECYCLE]: recycle
      },
      data,
      hauler
    );
  }
}
