import { generateMissionId, MissionStatus } from 'Missions/Mission';

export enum SquadMissionType {
  ATTACKER_HEALER_DUO = 'ahd'
}

export interface SquadMission<T extends SquadMissionType> {
  id: string;
  office: string;
  type: T;
  status: MissionStatus;
  data: any;
}

declare global {
  interface OfficeMemory {
    squadMissions: SquadMission<SquadMissionType>[];
  }
  interface CreepMemory {
    squad?: SquadMission<SquadMissionType>['id'];
  }
}

export function createSquadMission<T extends SquadMissionType>(office: string, type: T, data: any) {
  Memory.offices[office].squadMissions ??= [];
  const mission = {
    id: generateMissionId(),
    office,
    type,
    status: MissionStatus.PENDING,
    data
  };
  Memory.offices[office].squadMissions.push(mission);
  return mission;
}
