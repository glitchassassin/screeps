import { BaseDuoMission, BaseDuoMissionData } from 'Missions/BaseClasses/BaseDuoMission';
import { priorityKillTarget } from 'Selectors/Combat/priorityTarget';
import { ResolvedCreeps, ResolvedMissions } from '../BaseClasses/MissionImplementation';

export interface DefendOfficeMissionData extends BaseDuoMissionData {}

export class DefendOfficeMission extends BaseDuoMission {
  priority = 15;

  constructor(public missionData: DefendOfficeMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: DefendOfficeMission['id']) {
    return super.fromId(id) as DefendOfficeMission;
  }

  run(
    creeps: ResolvedCreeps<DefendOfficeMission>,
    missions: ResolvedMissions<DefendOfficeMission>,
    data: DefendOfficeMissionData
  ) {
    data.stayInRamparts = true;
    data.killTarget = priorityKillTarget(data.office)?.id;

    super.run(creeps, missions, data);
  }
}
