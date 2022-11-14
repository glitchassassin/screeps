import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import { ResolvedCreeps, ResolvedMissions } from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { UpgradeMission, UpgradeMissionData } from './UpgradeMission';

export class EmergencyUpgradeMission extends UpgradeMission {
  public creeps = {
    upgraders: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.RESEARCH,
      budget: Budget.ESSENTIAL,
      builds: energy => MinionBuilders[MinionTypes.RESEARCH](energy),
      count: current => {
        if (!this.emergency() || current.length) return 0;
        return 1;
      }
    })
  };

  emergency() {
    return (Game.rooms[this.missionData.office].controller?.ticksToDowngrade ?? 0) < 3000;
  }

  priority = 15;
  static fromId(id: EmergencyUpgradeMission['id']) {
    return super.fromId(id) as EmergencyUpgradeMission;
  }

  run(creeps: ResolvedCreeps<UpgradeMission>, missions: ResolvedMissions<UpgradeMission>, data: UpgradeMissionData) {
    super.run(creeps, missions, data);
    if (!this.emergency() && !creeps.upgraders.length) {
      this.status = MissionStatus.DONE;
    }
  }
}
