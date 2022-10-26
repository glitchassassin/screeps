import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { ConditionalMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/ConditionalMissionSpawner';
import { MissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MissionSpawner';
import { MultiMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MultiMissionSpawner';
import { refillSquares } from 'Reports/fastfillerPositions';
import { byId } from 'Selectors/byId';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { calculateNearbyRooms } from 'Selectors/Map/MapCoordinates';
import { buyMarketPrice } from 'Selectors/Market/marketPrice';
import { rcl } from 'Selectors/rcl';
import { min } from 'Selectors/reducers';
import { mineralId } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { DefenseCoordinationMission } from './DefenseCoordinationMission';
import { EngineerMission } from './EngineerMission';
import { ExploreMission } from './ExploreMission';
import { FastfillerMission } from './FastfillerMission';
import { HarvestMission } from './HarvestMission';
import { HQLogisticsMission } from './HQLogisticsMission';
import { LogisticsMission } from './LogisticsMission';
import { MineMission } from './MineMission';
import { MobileRefillMission } from './MobileRefillMission';
import { PlunderMission } from './PlunderMission';
import { PowerBankMission } from './PowerBankMission';
import { ReserveMission } from './ReserveMission';
import { ScienceMission } from './ScienceMission';
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
    upgrade: new MissionSpawner(UpgradeMission, () => ({ ...this.missionData })),
    science: new ConditionalMissionSpawner(
      ScienceMission,
      () => ({ ...this.missionData }),
      () => Boolean(roomPlans(this.missionData.office)?.labs?.labs.filter(s => s.structure).length)
    ),
    defense: new MissionSpawner(DefenseCoordinationMission, () => ({ ...this.missionData })),
    mining: new ConditionalMissionSpawner(
      MineMission,
      () => ({ mineral: mineralId(this.missionData.office)!, ...this.missionData }),
      () => Boolean(byId(mineralId(this.missionData.office))?.mineralAmount)
    ),
    powerBanks: new MultiMissionSpawner(PowerBankMission, current => {
      if (current.length || rcl(this.missionData.office) < 8) return []; // only one powerbank mission per office at a time
      const powerbank = Memory.offices[this.missionData.office].powerbanks
        .filter(r => r.powerCost && r.powerCost < buyMarketPrice(RESOURCE_POWER) && r.hits === POWER_BANK_HITS)
        .reduce(
          min(r => r.powerCost ?? Infinity),
          undefined
        );
      if (!powerbank) return [];
      return [{ ...this.missionData, powerBank: powerbank.id, powerBankPos: powerbank.pos }];
    }),
    plunder: new MultiMissionSpawner(PlunderMission, current => {
      if (current.length || !roomPlans(this.missionData.office)?.headquarters?.terminal.structure) return []; // only one plunder mission per office
      const targetRoom = calculateNearbyRooms(this.missionData.office, 3, false).find(
        r => Memory.rooms[r]?.plunder?.resources.length
      );
      if (!targetRoom) return [];
      return [{ ...this.missionData, targetRoom }];
    })
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
