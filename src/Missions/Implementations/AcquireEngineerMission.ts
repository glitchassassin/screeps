import { BehaviorResult } from 'Behaviors/Behavior';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import { ResolvedCreeps, ResolvedMissions } from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { rcl } from 'Selectors/rcl';
import { memoizeByTick } from 'utils/memoizeFunction';
import { EngineerMission, EngineerMissionData } from './EngineerMission';

export interface AcquireEngineerMissionData extends EngineerMissionData {
  initialized?: boolean;
  targetOffice: string;
}

export class AcquireEngineerMission extends EngineerMission {
  budget = Budget.ECONOMY;
  public creeps = {
    engineer: new CreepSpawner('e', this.missionData.office, {
      role: MinionTypes.ENGINEER,
      budget: this.budget,
      builds: energy =>
        MinionBuilders[MinionTypes.ENGINEER](energy, this.calculated().roads, !this.missionData.franchise)
    })
  };

  priority = 8;

  constructor(public missionData: AcquireEngineerMissionData, id?: string) {
    super(missionData, id);
  }

  static fromId(id: AcquireEngineerMission['id']) {
    return super.fromId(id) as AcquireEngineerMission;
  }

  calculated = memoizeByTick(
    () => '',
    () => {
      return {
        roads: rcl(this.missionData.office) > 3
      };
    }
  );

  run(
    creeps: ResolvedCreeps<AcquireEngineerMission>,
    missions: ResolvedMissions<AcquireEngineerMission>,
    data: AcquireEngineerMissionData
  ) {
    const { engineer } = creeps;
    if (!engineer) return;
    if (!data.initialized) {
      // Load up with energy from sponsor office
      if (getEnergyFromStorage(engineer, data.office) === BehaviorResult.SUCCESS) {
        this.recordEnergy(engineer.store.getUsedCapacity(RESOURCE_ENERGY));
        data.office = data.targetOffice;
        data.initialized = true;
      }
    } else {
      super.run(creeps, missions, data);
    }
  }
}
