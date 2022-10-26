import { missionById } from './BaseClasses/MissionImplementation';
import { MainOfficeMission } from './Implementations/MainOfficeMission';

declare global {
  interface OfficeMemory {
    missionId?: MainOfficeMission['id'];
  }
}

let initializedCreeps = false;
const officeMissions = new Map<string, MainOfficeMission>();
export function initializeOfficeMissions() {
  for (const office in Memory.offices) {
    if (!officeMissions.has(office)) {
      const mission = new MainOfficeMission({ office }, Memory.offices[office].missionId);
      mission.init();
      Memory.offices[office].missionId = mission.id;
      officeMissions.set(office, mission);
    }
  }
  if (!initializedCreeps) {
    initializedCreeps = true;
    // register creeps
    for (let creep in Game.creeps) {
      const mission = missionById(Game.creeps[creep].memory.missionId.split('|')[0]);
      mission?.register(Game.creeps[creep]);
    }
  }
}
