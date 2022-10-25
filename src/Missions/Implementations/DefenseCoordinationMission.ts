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
import { sum } from 'Selectors/reducers';
import { DefendOfficeMission } from './DefendOfficeMission';
import { DefendRemoteMission } from './DefendRemoteMission';
import { KillCoreMission } from './KillCoreMission';

export interface DefenseCoordinationMissionData extends BaseMissionData {}

export class DefenseCoordinationMission extends MissionImplementation {
  public missions = {
    defendOffice: new MultiMissionSpawner(DefendOfficeMission, current => {
      if (
        totalCreepStats(findHostileCreeps(this.missionData.office)).score > current.map(m => m.score()).reduce(sum, 0)
      ) {
        return [this.missionData];
      }
      return [];
    }),
    defendRemotes: new MissionSpawner(DefendRemoteMission, () => this.missionData),
    coreKiller: new MultiMissionSpawner(KillCoreMission, current => {
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
