import { Mission, MissionStatus, MissionType } from 'Missions/Mission';
import { squadMissionById } from 'Missions/Selectors';
import { getSquadMission } from 'Missions/Squads/getSquadMission';

export abstract class MissionImplementation {
  static run(mission: Mission<MissionType>, creep?: Creep) {
    // Default implementation does nothing
    if (mission.status === MissionStatus.RUNNING && !creep) {
      // creep is dead
      mission.status = MissionStatus.DONE;
      this.onEnd(mission);
      return;
    }
    if (creep?.memory.squad) {
      const squadMission = squadMissionById(mission.office, creep.memory.squad);
      if (squadMission) getSquadMission(squadMission).register(creep);
    }
    if (!creep || creep?.spawning) return; // wait for creep

    if (mission.status === MissionStatus.PENDING) {
      mission.status = MissionStatus.RUNNING;
      this.onStart(mission, creep);
    }

    mission.efficiency ??= { running: 0, working: 0 };
    mission.efficiency.running += 1;
    this.minionLogic(mission, creep);
  }
  /**
   * Runs each tick, once per assigned minion
   */
  static minionLogic(mission: Mission<MissionType>, creep: Creep) {
    // Default implementation does nothing
  }
  /**
   * Runs once when the mission starts
   */
  static onStart(mission: Mission<MissionType>, creep: Creep) {
    // default implementation does nothing
  }
  /**
   * Runs once when the creep dies
   */
  static onEnd(mission: Mission<MissionType>) {
    // default implementation does nothing
  }
}
