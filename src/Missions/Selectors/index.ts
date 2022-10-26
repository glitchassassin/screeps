import { allMissions, missionById, MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { MissionStatus } from 'Missions/Mission';
import { furthestActiveFranchiseRoundTripDistance } from 'Selectors/Franchises/franchiseActive';
import { roomPlans } from 'Selectors/roomPlans';
import { memoizeByTick } from 'utils/memoizeFunction';

export function isMission<T extends typeof MissionImplementation>(missionType: T) {
  return (mission: MissionImplementation): mission is InstanceType<T> => mission instanceof missionType;
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
  return (mission: { status: MissionStatus }) => mission.status === status;
}

export function assignedMission(creep: Creep): MissionImplementation | undefined {
  return creep.memory.missionId ? missionById(creep.memory.missionId) : undefined;
}

export function estimateMissionInterval(office: string) {
  if (roomPlans(office)?.headquarters?.storage.structure) {
    return CREEP_LIFE_TIME;
  } else {
    return Math.max(100, furthestActiveFranchiseRoundTripDistance(office) * 1.2); // This worked best in my tests to balance income with expenses
  }
}

export const missionsByOffice = memoizeByTick(
  () => '',
  () => {
    const missions: Record<string, MissionImplementation[]> = {};
    for (const mission of allMissions()) {
      missions[mission.missionData.office] ??= [];
      missions[mission.missionData.office].push(mission);
    }
    return missions;
  }
);

export const activeMissions = (office: string) => missionsByOffice()[office];
