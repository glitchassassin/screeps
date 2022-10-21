import { generateMissionId, MissionStatus } from 'Missions/Mission';

export enum SquadMissionType {
  ATTACKER_HEALER_DUO = 'ahd',
  POWER_BANK = 'pb',
  POWER_BANK_DUO = 'pbd'
}

export interface SquadMission<T extends SquadMissionType, D extends {}> {
  id: string;
  office: string;
  priority: number;
  type: T;
  status: MissionStatus;
  data: D;
}

declare global {
  interface OfficeMemory {
    squadMissions: SquadMission<SquadMissionType, any>[];
  }
  interface CreepMemory {
    squad?: SquadMission<SquadMissionType, any>['id'];
  }
}

export function createSquadMission<T extends SquadMissionType>(office: string, type: T, priority: number, data: any) {
  Memory.offices[office].squadMissions ??= [];
  const mission = {
    id: generateMissionId(),
    office,
    type,
    priority,
    status: MissionStatus.PENDING,
    data
  };
  Memory.offices[office].squadMissions.push(mission);
  return mission;
}
