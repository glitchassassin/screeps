import { BaseMissionData, MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { ConditionalMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/ConditionalMissionSpawner';
import { MissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MissionSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { rcl } from 'Selectors/rcl';
import { unpackPos } from 'utils/packrat';
import { AcquireEngineerMission } from './AcquireEngineerMission';
import { AcquireLawyerMission } from './AcquireLawyerMission';

export interface AcquireMissionData extends BaseMissionData {
  targetOffice: string;
}

export class AcquireMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  public creeps = {};

  public missions = {
    claim: new ConditionalMissionSpawner(
      AcquireLawyerMission,
      () => this.missionData,
      () => !Game.rooms[this.missionData.targetOffice]?.controller?.my
    ),
    engineers: new MissionSpawner(AcquireEngineerMission, () => this.missionData)
  };

  priority = 7;

  constructor(public missionData: AcquireMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: AcquireMission['id']) {
    return super.fromId(id) as AcquireMission;
  }

  onStart() {
    super.onStart();
    console.log('[AcquireMission] started targeting', unpackPos(this.missionData.targetOffice));
  }

  onEnd() {
    super.onEnd();
    console.log('[AcquireMission] finished in', unpackPos(this.missionData.targetOffice));
  }

  run() {
    if (rcl(this.missionData.targetOffice) > 4) {
      this.status = MissionStatus.DONE;
    }
  }
}
