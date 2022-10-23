import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { ResolvedCreeps, ResolvedMissions } from 'Missions/BaseClasses/MissionImplementation';
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
    return new this(Memory.missions[id].data, id);
  }

  run(
    creeps: ResolvedCreeps<MobileRefillMission>,
    missions: ResolvedMissions<MobileRefillMission>,
    data: MobileRefillMissionData
  ) {
    const { hauler } = creeps;

    if (!hauler) return;

    runStates(
      {
        [States.DEPOSIT]: deposit,
        [States.WITHDRAW]: withdraw(true),
        [States.RECYCLE]: recycle
      },
      data,
      hauler
    );
  }
}
