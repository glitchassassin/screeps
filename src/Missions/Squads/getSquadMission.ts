import { SquadMission, SquadMissionType } from '.';
import { SquadMissions } from './Missions';
import { SquadMissionImplementation } from './SquadMissionImplementation';

const missions = new Map<string, SquadMissionImplementation>();
export const getSquadMission = (mission: SquadMission<SquadMissionType, any>) => {
  const missionImplementation = missions.get(mission.id) ?? new SquadMissions[mission.type](mission);
  missions.set(mission.id, missionImplementation);
  return missionImplementation;
};
