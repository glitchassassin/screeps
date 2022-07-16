import { MissionTypes } from "Missions/Implementations";
import { Mission, MissionStatus, MissionType } from "Missions/Mission";

export function activeMissions(office: string) {
  return Memory.offices[office]?.activeMissions ?? [];
}

export function pendingMissions(office: string) {
  return Memory.offices[office]?.pendingMissions ?? [];
}

export function submitMission(office: string, mission: Mission<MissionType>) {
  Memory.offices[office]?.pendingMissions.push(mission);
}

export function pendingAndActiveMissions(office: string) {
  return [...activeMissions(office), ...pendingMissions(office)]
}

export function isMission<T extends MissionType>(missionType: T) {
  return (mission: Mission<any>): mission is MissionTypes[T] => mission.type === missionType
}

export function and<T>(...conditions: ((t: T) => boolean)[]) {
  return (t: T) => conditions.every(c => c(t));
}

export function or<T>(...conditions: ((t: T) => boolean)[]) {
  return (t: T) => conditions.some(c => c(t));
}

export function not<T>(condition: (t: T) => boolean) {
  return (t: T) => !condition(t)
}

export function isStatus(status: MissionStatus) {
  return (mission: Mission<MissionType>) => mission.status === status;
}

export function assignedCreep(mission: Mission<MissionType>): Creep|undefined {
  return Game.creeps[mission.creepNames[0] ?? ''];
}
