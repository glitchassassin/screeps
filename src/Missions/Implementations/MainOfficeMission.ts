import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { MissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MissionSpawner';
import { MultiMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MultiMissionSpawner';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { HarvestMission } from './HarvestMission';
import { LogisticsMission } from './LogisticsMission';

export interface MainOfficeMissionData extends BaseMissionData {}

export class MainOfficeMission extends MissionImplementation {
  public missions = {
    harvest: new MultiMissionSpawner(HarvestMission, current => {
      const franchises = new Set(franchisesByOffice(this.missionData.office, true).map(({ source }) => source));
      for (const mission of current) {
        franchises.delete(mission.missionData.source);
      }
      return [...franchises].map(source => ({ source, ...this.missionData }));
    }),
    logistics: new MissionSpawner(LogisticsMission, () => ({ ...this.missionData }))
  };

  priority = 20;

  constructor(public missionData: MainOfficeMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: MainOfficeMission['id']) {
    return new this(Memory.missions[id].data, id);
  }
  run(
    creeps: ResolvedCreeps<MainOfficeMission>,
    missions: ResolvedMissions<MainOfficeMission>,
    data: MainOfficeMissionData
  ) {}
}
