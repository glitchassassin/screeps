import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { fixedCount } from 'Missions/BaseClasses';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import { Budget } from 'Missions/Budgets';
import { LogisticsMission, LogisticsMissionData } from './LogisticsMission';

export interface MobileRefillMissionData extends LogisticsMissionData {
  withdrawTarget?: Id<Source>;
  depositTarget?: Id<AnyStoreStructure | Creep>;
  repair?: boolean;
}

export class MobileRefillMission extends LogisticsMission {
  public creeps = {
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.ESSENTIAL,
      body: energy =>
        MinionBuilders[MinionTypes.ACCOUNTANT](energy, 25, this.calculated().roads, this.calculated().repair),
      count: fixedCount(() => 1)
    })
  };
  priority = 11;

  constructor(public missionData: MobileRefillMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: MobileRefillMission['id']) {
    return super.fromId(id) as MobileRefillMission;
  }

  fromStorage = true;
}
