import { LogisticsMission, LogisticsMissionData } from './LogisticsMission';

export interface MobileRefillMissionData extends LogisticsMissionData {
  withdrawTarget?: Id<Source>;
  depositTarget?: Id<AnyStoreStructure | Creep>;
  repair?: boolean;
}

export class MobileRefillMission extends LogisticsMission {
  priority = 11;

  constructor(public missionData: MobileRefillMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: MobileRefillMission['id']) {
    return super.fromId(id) as MobileRefillMission;
  }

  fromStorage = true;
}
