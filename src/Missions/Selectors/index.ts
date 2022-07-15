import { MissionTypes } from "Missions/Implementations";
import { Mission, MissionType } from "Missions/Mission";

export function activeMissions(office: string) {
  return Memory.offices[office]?.activeMissions ?? [];
}

export function pendingMissions(office: string) {
  return Memory.offices[office]?.pendingMissions ?? [];
}

export function pendingAndActiveMissions(office: string) {
  return [...activeMissions(office), ...pendingMissions(office)]
}

export function isMission<T extends MissionType>(missionType: T) {
  return (mission: Mission<any>): mission is MissionTypes[T] => mission.type === missionType
}
