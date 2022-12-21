import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { MissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MissionSpawner';
import { MultiMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MultiMissionSpawner';
import { totalCreepStats } from 'Selectors/Combat/combatStats';
import { findHostileCreeps } from 'Selectors/findHostileCreeps';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { findAcquireTarget } from 'Strategy/Acquire/findAcquireTarget';
import { DefendOfficeMission } from './DefendOfficeMission';
import { DefendRemoteMission } from './DefendRemoteMission';
import { KillCoreMission } from './KillCoreMission';

export interface DefenseCoordinationMissionData extends BaseMissionData {}

export class DefenseCoordinationMission extends MissionImplementation {
  public missions = {
    defendOffice: new MultiMissionSpawner(DefendOfficeMission, current => {
      if (rcl(this.missionData.office) < 4) return []; // until we have ramparts, we'll rely mostly on rangers
      if (findAcquireTarget() === this.missionData.office) return []; // if we're acquiring, parent office will defend
      if (current.some(m => !m.assembled())) return []; // re-evaluate after finishing this duo
      const hostileScore = totalCreepStats(findHostileCreeps(this.missionData.office)).score;
      const allyScore = current.map(m => m.score()).reduce(sum, 0);
      if (hostileScore > allyScore) {
        return [this.missionData];
      }
      return [];
    }),
    defendRemotes: new MissionSpawner(DefendRemoteMission, () => this.missionData),
    coreKiller: new MultiMissionSpawner(KillCoreMission, current => {
      if (current.some(m => !m.assembled())) return []; // re-evaluate after finishing current missions
      const cores = franchisesByOffice(this.missionData.office)
        .map(({ room }) => room)
        .filter(room => Memory.rooms[room].invaderCore);
      if (current.length >= cores.length) return [];
      const newCores = cores.filter(room => !current.some(m => m.missionData.targetRoom === room));
      return newCores.map(targetRoom => ({ ...this.missionData, targetRoom }));
    })
  };

  priority = 20;

  constructor(public missionData: DefenseCoordinationMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: DefenseCoordinationMission['id']) {
    return super.fromId(id) as DefenseCoordinationMission;
  }
  run(
    creeps: ResolvedCreeps<DefenseCoordinationMission>,
    missions: ResolvedMissions<DefenseCoordinationMission>,
    data: DefenseCoordinationMissionData
  ) {}
}
