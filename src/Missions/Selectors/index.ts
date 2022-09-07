import { MissionTypes } from 'Missions/Implementations';
import { Mission, MissionStatus, MissionType } from 'Missions/Mission';
import { furthestActiveFranchiseRoundTripDistance } from 'Selectors/Franchises/franchiseActive';
import { roomPlans } from 'Selectors/roomPlans';

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
  return [...activeMissions(office), ...pendingMissions(office)];
}

export function isMission<T extends MissionType>(missionType: T) {
  return (mission: Mission<any>): mission is MissionTypes[T] => mission.type === missionType;
}

export function and<T>(...conditions: ((t: T) => boolean)[]) {
  return (t: T) => conditions.every(c => c(t));
}

export function or<T>(...conditions: ((t: T) => boolean)[]) {
  return (t: T) => conditions.some(c => c(t));
}

export function not<T>(condition: (t: T) => boolean) {
  return (t: T) => !condition(t);
}

export function isStatus(status: MissionStatus) {
  return (mission: Mission<MissionType>) => mission.status === status;
}

export function assignedCreep(mission: Mission<MissionType>): Creep | undefined {
  return Game.creeps[mission.creepNames[0] ?? ''];
}

export function estimateMissionInterval(office: string) {
  if (roomPlans(office)?.headquarters?.storage.structure) {
    return CREEP_LIFE_TIME;
  } else {
    return Math.max(100, furthestActiveFranchiseRoundTripDistance(office) * 1.2); // This worked best in my tests to balance income with expenses
  }
}

export function deletePendingMission(office: string, mission: Mission<MissionType>) {
  const index = Memory.offices[office].pendingMissions.indexOf(mission);
  if (index === -1) return;
  Memory.offices[office].pendingMissions.splice(index);
}

/**
 * Expects a mission with `arrived` data
 */
export function missionExpired(mission: Mission<MissionType>) {
  const ttl = assignedCreep(mission)?.ticksToLive;
  if (!ttl) return mission.status === MissionStatus.RUNNING; // creep should be alive, but isn't
  if (!mission.data.arrived) return false;
  return ttl <= mission.data.arrived;
}
