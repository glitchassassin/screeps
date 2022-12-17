import { BaseDuoMission, BaseDuoMissionData } from 'Missions/BaseClasses/BaseDuoMission';
import { priorityKillTarget } from 'Selectors/Combat/priorityTarget';
import { packPos } from 'utils/packrat';
import { ResolvedCreeps, ResolvedMissions } from '../BaseClasses/MissionImplementation';

export interface DefendAcquireMissionData extends BaseDuoMissionData {
  targetOffice: string;
  arrived?: number;
}

export class DefendAcquireMission extends BaseDuoMission {
  priority = 7.7;

  constructor(public missionData: DefendAcquireMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: DefendAcquireMission['id']) {
    return super.fromId(id) as DefendAcquireMission;
  }

  run(
    creeps: ResolvedCreeps<DefendAcquireMission>,
    missions: ResolvedMissions<DefendAcquireMission>,
    data: DefendAcquireMissionData
  ) {
    data.killTarget = priorityKillTarget(data.targetOffice)?.id;
    data.rallyPoint ??= {
      pos: packPos(new RoomPosition(25, 25, data.targetOffice)),
      range: 20
    };

    if (creeps.attacker?.pos.roomName === data.targetOffice) {
      data.arrived ??= CREEP_LIFE_TIME - (creeps.attacker.ticksToLive ?? 100);
    }

    super.run(creeps, missions, data);
  }
}
