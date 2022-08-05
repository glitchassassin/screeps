import { Mission, MissionStatus, MissionType } from 'Missions/Mission';
import { minionCost } from 'Selectors/minionCostPerTick';

export abstract class MissionImplementation {
  static spawn(mission: Mission<MissionType>) {
    // Default implementation does nothing
  }
  static run(mission: Mission<MissionType>) {
    // Default implementation does nothing
    const creep = Game.creeps[mission.creepNames[0]];
    const spawnOrder = Memory.offices[mission.office].spawnQueue.find(o => o.data.name === mission.creepNames[0]);
    if (!spawnOrder && !creep) {
      // creep is dead
      if (mission.creepNames[0].startsWith('ACCOUNTANT')) console.log(Game.time, mission.creepNames[0], 'died');
      mission.status = MissionStatus.DONE;
      return;
    }
    if (!creep || creep.spawning) return; // wait for creep

    if (mission.status === MissionStatus.SCHEDULED || mission.status === MissionStatus.STARTING) {
      mission.status = MissionStatus.RUNNING;
      // Record spawning expenses
      mission.actual.cpu += 0.2; // Spawning intent
      mission.actual.energy += minionCost(creep.body.map(p => p.type));
      // Adjust estimate with actual spawning cost, if needed
      mission.estimate.energy += Math.max(0, mission.actual.energy - mission.estimate.energy);
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
}
