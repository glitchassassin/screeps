import { FEATURES } from 'config';
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
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { calculateNearbyRooms } from 'Selectors/Map/MapCoordinates';
import { buyMarketPrice } from 'Selectors/Market/marketPrice';
import { rcl } from 'Selectors/rcl';
import { min } from 'Selectors/reducers';
import { mineralId } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { CleanupMission } from './CleanupMission';
import { DefenseCoordinationMission } from './DefenseCoordinationMission';
import { EmergencyUpgradeMission } from './EmergencyUpgradeMission';
import { EngineerMission } from './EngineerMission';
import { ExploreMission } from './ExploreMission';
import { FastfillerMission } from './FastfillerMission';
import { HarvestMission } from './HarvestMission';
import { HQLogisticsMission } from './HQLogisticsMission';
import { LogisticsMission } from './LogisticsMission';
import { MineMission } from './MineMission';
import { PlunderMission } from './PlunderMission';
import { PowerBankMission } from './PowerBankMission';
import { ReserveMission } from './ReserveMission';
import { ScienceMission } from './ScienceMission';
import { UpgradeMission } from './UpgradeMission';

export interface MainOfficeMissionData extends BaseMissionData {}

export class MainOfficeMission extends MissionImplementation {
  public missions = {
    harvest: new MultiMissionSpawner(HarvestMission, current => {
      const franchises = new Set(franchisesByOffice(this.missionData.office).map(({ source }) => source));
      for (const mission of current) {
        franchises.delete(mission.missionData.source);
      }
      return [...franchises].map(source => ({ source, ...this.missionData }));
    }),
    logistics: new MissionSpawner(LogisticsMission, () => ({ ...this.missionData })),
    explore: new MissionSpawner(ExploreMission, () => ({ ...this.missionData })),
    fastfiller: new ConditionalMissionSpawner(
      FastfillerMission,
      () => ({
        ...this.missionData,
        refillSquares: refillSquares(this.missionData.office)
      }),
      () =>
        Boolean(
          roomPlans(this.missionData.office)?.fastfiller?.containers.some(e => e.structure) &&
            hasEnergyIncome(this.missionData.office)
        )
    ),
    engineer: new MissionSpawner(EngineerMission, () => ({ ...this.missionData })),
    reserve: new MissionSpawner(ReserveMission, () => ({ ...this.missionData })),
    cleanup: new MissionSpawner(CleanupMission, () => ({ ...this.missionData })),
    hqLogistics: new ConditionalMissionSpawner(
      HQLogisticsMission,
      () => ({ ...this.missionData }),
      () => Boolean(roomPlans(this.missionData.office)?.headquarters?.link.structure)
    ),
    upgrade: new MissionSpawner(UpgradeMission, () => ({ ...this.missionData })),
    emergencyUpgrade: new ConditionalMissionSpawner(
      EmergencyUpgradeMission,
      () => ({ ...this.missionData }),
      () => Game.rooms[this.missionData.office].controller!.ticksToDowngrade < 3000
    ),
    science: new ConditionalMissionSpawner(
      ScienceMission,
      () => ({ ...this.missionData }),
      () => Boolean(FEATURES.LABS && roomPlans(this.missionData.office)?.labs?.labs.filter(s => s.structure).length)
    ),
    defense: new MissionSpawner(DefenseCoordinationMission, () => ({ ...this.missionData })),
    mining: new ConditionalMissionSpawner(
      MineMission,
      () => ({ mineral: mineralId(this.missionData.office)!, ...this.missionData }),
      () =>
        Boolean(
          FEATURES.MINING &&
            byId(mineralId(this.missionData.office))?.mineralAmount &&
            roomPlans(this.missionData.office)?.mine?.extractor.structure
        )
    ),
    powerBanks: new MultiMissionSpawner(PowerBankMission, current => {
      if (current.length || rcl(this.missionData.office) < 8 || !FEATURES.POWER) return []; // only one powerbank mission per office at a time
      const powerbank = Memory.offices[this.missionData.office].powerbanks
        .filter(
          r =>
            r.distance &&
            r.distance < 550 &&
            r.powerCost &&
            r.powerCost < buyMarketPrice(RESOURCE_POWER) &&
            r.hits === POWER_BANK_HITS &&
            r.expires - Game.time > 3000
        )
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
