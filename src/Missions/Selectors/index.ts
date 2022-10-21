import { MissionTypes } from 'Missions/Implementations';
import { Mission, MissionStatus, MissionType } from 'Missions/Mission';
import { SquadMission, SquadMissionType } from 'Missions/Squads';
import { SquadMissionTypes } from 'Missions/Squads/Missions';
import { furthestActiveFranchiseRoundTripDistance } from 'Selectors/Franchises/franchiseActive';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';

const creepsByOffice = new Map<string, Set<string>>();
let initialized = false;
export function initializeCreepIndex() {
  if (initialized) return;
  initialized = true;
  for (const creep in Game.creeps) {
    if (!Memory.creeps[creep]?.mission?.office) {
      console.log(creep, 'with no mission', JSON.stringify(Game.creeps[creep]));
      continue;
    }
    const creeps = creepsByOffice.get(Memory.creeps[creep].mission.office) ?? new Set();
    creeps.add(creep);
    creepsByOffice.set(Memory.creeps[creep].mission.office, creeps);
  }
}

export function assignCreepToOffice(creep: Creep, office: string) {
  creepsByOffice.get(creep.memory.mission.office)?.delete(creep.name);
  const creeps = creepsByOffice.get(office) ?? new Set();
  creeps.add(creep.name);
  creepsByOffice.set(office, creeps);
}

export function activeCreeps(office: string) {
  const creeps = [...(creepsByOffice.get(office) ?? [])].filter(c => Memory.creeps[c]?.mission);
  creepsByOffice.set(office, new Set(creeps));
  return creeps;
}

export function activeMissions(office: string) {
  return activeCreeps(office)
    .map(c => Memory.creeps[c].mission)
    .filter(m => m);
}

export function activeSquadMissions(office: string) {
  return Memory.offices[office].squadMissions;
}

export function squadMissionById(office: string, id: string) {
  return activeSquadMissions(office).find(m => m.id === id);
}

export function registerSpawningCreeps() {
  for (const office in Memory.offices) {
    const creeps = creepsByOffice.get(office) ?? new Set();
    for (const spawn of getSpawns(office)) {
      if (spawn.spawning?.name) {
        creeps.add(spawn.spawning?.name);
      }
    }
    creepsByOffice.set(office, creeps);
  }
}

export function isMission<T extends MissionType>(missionType: T) {
  return (mission: Mission<any>): mission is MissionTypes[T] => mission?.type === missionType;
}
export function isSquadMission<T extends SquadMissionType>(missionType: T) {
  return (mission: SquadMission<SquadMissionType, any>): mission is SquadMissionTypes[T] =>
    mission?.type === missionType;
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

export function assignedCreep(mission: Mission<MissionType>): Creep | undefined {
  return Game.creeps[mission.creep ?? ''];
}

export function assignedMission(creep: Creep): Mission<MissionType> | undefined {
  return creep.memory?.mission;
}

export function estimateMissionInterval(office: string) {
  if (roomPlans(office)?.headquarters?.storage.structure) {
    return CREEP_LIFE_TIME;
  } else {
    return Math.max(100, furthestActiveFranchiseRoundTripDistance(office) * 1.2); // This worked best in my tests to balance income with expenses
  }
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
