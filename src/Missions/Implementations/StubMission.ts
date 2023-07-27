import { BaseMissionData, MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';

export interface StubMissionData extends BaseMissionData {}

export class StubMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  priority = 0;
  initialEstimatedCpuOverhead = 0.0;

  constructor(
    public missionData: StubMissionData,
    id?: string
  ) {
    super(missionData, id);
  }
  static fromId(id: StubMission['id']) {
    return super.fromId(id) as StubMission;
  }

  static shouldRun(missionData: BaseMissionData, current: StubMission[]): StubMissionData[] {
    return [];
  }

  run() {
    this.status = MissionStatus.DONE;
  }
}
