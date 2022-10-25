import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { MissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MissionSpawner';
import { MultiMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MultiMissionSpawner';
import { refillSquares } from 'Reports/fastfillerPositions';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { EngineerMission } from './EngineerMission';
import { ExploreMission } from './ExploreMission';
import { FastfillerMission } from './FastfillerMission';
import { HarvestMission } from './HarvestMission';
import { HQLogisticsMission } from './HQLogisticsMission';
import { LogisticsMission } from './LogisticsMission';
import { MobileRefillMission } from './MobileRefillMission';
import { ReserveMission } from './ReserveMission';
import { UpgradeMission } from './UpgradeMission';

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
    logistics: new MissionSpawner(LogisticsMission, () => ({ ...this.missionData })),
    explore: new MissionSpawner(ExploreMission, () => ({ ...this.missionData })),
    fastfiller: new MissionSpawner(FastfillerMission, () => ({
      ...this.missionData,
      refillSquares: refillSquares(this.missionData.office)
    })),
    mobileRefill: new MissionSpawner(MobileRefillMission, () => ({ ...this.missionData })),
    engineer: new MissionSpawner(EngineerMission, () => ({ ...this.missionData })),
    reserve: new MissionSpawner(ReserveMission, () => ({ ...this.missionData })),
    hqLogistics: new MissionSpawner(HQLogisticsMission, () => ({ ...this.missionData })),
    upgrade: new MissionSpawner(UpgradeMission, () => ({ ...this.missionData }))
  };

  priority = 20;

  constructor(public missionData: MainOfficeMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: MainOfficeMission['id']) {
    return super.fromId(id) as MainOfficeMission;
  }
  run(
    creeps: ResolvedCreeps<MainOfficeMission>,
    missions: ResolvedMissions<MainOfficeMission>,
    data: MainOfficeMissionData
  ) {}
}
