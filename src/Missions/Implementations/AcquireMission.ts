import { BaseMissionData, MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { ConditionalMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/ConditionalMissionSpawner';
import { MultiMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MultiMissionSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { plannedStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { sum } from 'Selectors/reducers';
import {
  findAcquireTarget,
  officeShouldAcquireTarget,
  officeShouldClaimAcquireTarget,
  officeShouldSupportAcquireTarget
} from 'Strategy/Acquire/findAcquireTarget';
import { roomThreatLevel } from 'Strategy/Territories/HarassmentZones';
import { AcquireEngineerMission } from './AcquireEngineerMission';
import { AcquireLawyerMission } from './AcquireLawyerMission';
import { DefendAcquireMission } from './DefendAcquireMission';

export interface AcquireMissionData extends BaseMissionData {
  targetOffice: string;
}

export class AcquireMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  public creeps = {};

  public missions = {
    claim: new ConditionalMissionSpawner(
      AcquireLawyerMission,
      () => this.missionData,
      () => officeShouldClaimAcquireTarget(this.missionData.office)
    ),
    engineers: new ConditionalMissionSpawner(
      AcquireEngineerMission,
      () => this.missionData,
      () => officeShouldSupportAcquireTarget(this.missionData.office)
    ),
    defenders: new MultiMissionSpawner(DefendAcquireMission, current => {
      if (current.some(m => !m.assembled())) return []; // re-evaluate after finishing this duo
      const hostileScore = roomThreatLevel(this.missionData.targetOffice);
      const allyScore = current
        .filter(m => {
          // ignore attackers that are about to die
          const ttl = m.creeps.attacker.resolved?.ticksToLive;
          return !m.missionData.arrived || !ttl || ttl > m.missionData.arrived;
        })
        .map(m => m.score())
        .reduce(sum, 0);
      if (hostileScore > allyScore) {
        return [this.missionData];
      }
      return [];
    })
  };

  priority = 7;

  constructor(
    public missionData: AcquireMissionData,
    id?: string
  ) {
    super(missionData, id);
    // estimate energy remaining for upgrade
    this.updateEstimatedEnergyRemaining();
  }
  static fromId(id: AcquireMission['id']) {
    return super.fromId(id) as AcquireMission;
  }

  onStart() {
    super.onStart();
    console.log('[AcquireMission] started targeting', this.missionData.targetOffice);
  }

  onEnd() {
    super.onEnd();
    console.log('[AcquireMission] finished in', this.missionData.targetOffice);
  }

  static shouldRun(office: string) {
    const targetOffice = findAcquireTarget();
    return !!targetOffice && officeShouldAcquireTarget(office);
  }

  updateEstimatedEnergyRemaining() {
    const energyToUpgradeRcl4 = CONTROLLER_LEVELS[1] + CONTROLLER_LEVELS[2] + CONTROLLER_LEVELS[3];
    const progress = Game.rooms[this.missionData.targetOffice]?.controller?.progress ?? 0;
    const structureEnergyRemaining = plannedStructuresByRcl(this.missionData.targetOffice, 4)
      .map(s => s.energyToBuild + s.energyToRepair)
      .reduce(sum, 0);
    this.estimatedEnergyRemaining = energyToUpgradeRcl4 - progress + structureEnergyRemaining;
  }

  run() {
    if (!AcquireMission.shouldRun(this.missionData.office)) {
      this.status = MissionStatus.DONE;
    }
    if (Game.time % 10 === 0) this.updateEstimatedEnergyRemaining();
  }
}
