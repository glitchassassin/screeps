import { BaseDuoMission, BaseDuoMissionData } from 'Missions/BaseClasses/BaseDuoMission';
import { rampartsAreBroken } from 'Selectors/Combat/defenseRamparts';
import { priorityKillTarget } from 'Selectors/Combat/priorityTarget';
import { roomPlans } from 'Selectors/roomPlans';
import { packPos } from 'utils/packrat';
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
    const storagePos = roomPlans(data.office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, data.office);
    data.rallyPoint = rampartsAreBroken(data.office) ? { pos: packPos(storagePos), range: 10 } : undefined;
    data.stayInRamparts = true;
    data.killTarget = priorityKillTarget(data.office)?.id;

    super.run(creeps, missions, data);
  }
}
