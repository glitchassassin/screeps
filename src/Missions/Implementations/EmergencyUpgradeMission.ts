import { buildAccountant } from 'Minions/Builds/accountant';
import { buildResearch } from 'Minions/Builds/research';
import { MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import { ResolvedCreeps, ResolvedMissions } from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { rcl } from 'Selectors/rcl';
import { UpgradeMission, UpgradeMissionData } from './UpgradeMission';

export class EmergencyUpgradeMission extends UpgradeMission {
  budget = Budget.ESSENTIAL;
  public creeps = {
    upgraders: new MultiCreepSpawner('u', this.missionData.office, {
      role: MinionTypes.RESEARCH,
      budget: this.budget,
      builds: energy => buildResearch(energy),
      count: current => {
        if (!EmergencyUpgradeMission.shouldRun(this.missionData.office) || current.length) return 0;
        return 1;
      }
    }),
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: this.budget,
      builds: energy => buildAccountant(energy, 25, true, false),
      count: () => 0, // don't spawn haulers for emergency upgrade
      estimatedCpuPerTick: 1
    })
  };

  static shouldRun(office: string) {
    return (
      Game.rooms[office].controller!.ticksToDowngrade < 3000 ||
      rcl(office) < Math.max(...Object.keys(Memory.rooms[office].rclMilestones ?? {}).map(Number))
    );
  }

  priority = 15;
  static fromId(id: EmergencyUpgradeMission['id']) {
    return super.fromId(id) as EmergencyUpgradeMission;
  }

  run(creeps: ResolvedCreeps<UpgradeMission>, missions: ResolvedMissions<UpgradeMission>, data: UpgradeMissionData) {
    super.run(creeps, missions, data);
    if (!EmergencyUpgradeMission.shouldRun(data.office) && !creeps.upgraders.length) {
      this.status = MissionStatus.DONE;
    }
  }
}
