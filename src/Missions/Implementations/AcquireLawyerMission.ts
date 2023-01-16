import { signRoom } from 'Behaviors/signRoom';
import { buildLawyer } from 'Minions/Builds/lawyer';
import { MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { posById } from 'Selectors/posById';
import { officeShouldClaimAcquireTarget } from 'Strategy/Acquire/findAcquireTarget';

export interface AcquireLawyerMissionData extends BaseMissionData {
  targetOffice: string;
  targetController?: Id<StructureController>;
}

export class AcquireLawyerMission extends MissionImplementation {
  budget = Budget.EFFICIENCY;
  public creeps = {
    lawyer: new CreepSpawner('e', this.missionData.office, {
      role: MinionTypes.LAWYER,
      budget: this.budget,
      builds: energy => buildLawyer(energy)
    })
  };

  priority = 7.6;

  constructor(public missionData: AcquireLawyerMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: AcquireLawyerMission['id']) {
    return super.fromId(id) as AcquireLawyerMission;
  }

  onParentEnd() {
    this.status = MissionStatus.DONE;
  }

  run(
    creeps: ResolvedCreeps<AcquireLawyerMission>,
    missions: ResolvedMissions<AcquireLawyerMission>,
    data: AcquireLawyerMissionData
  ) {
    const { lawyer } = creeps;

    if (!officeShouldClaimAcquireTarget(data.office)) {
      this.status = MissionStatus.DONE;
    }

    if (this.creeps.lawyer.died && !Game.rooms[data.targetOffice]?.controller?.my) {
      this.status = MissionStatus.DONE;
    }
    if (!lawyer) return;

    if (data.targetOffice && Memory.rooms[data.targetOffice]) {
      Memory.rooms[data.targetOffice].lastAcquireAttempt = Game.time;
    }

    data.targetController ??=
      Memory.rooms[data.targetOffice].controllerId ?? Game.rooms[data.targetOffice]?.controller?.id;
    if (byId(data.targetController)?.my) {
      this.status = MissionStatus.DONE; // Already claimed this controller
      return;
    }

    const pos = posById(data.targetController);
    if (!pos) {
      // Not sure where controller is, move to room instead
      moveTo(lawyer, { pos: new RoomPosition(25, 25, data.targetOffice), range: 20 });
      return;
    }

    const result = moveTo(lawyer, { pos, range: 1 });
    if (lawyer.pos.inRangeTo(pos, 1)) {
      const controller = byId(data.targetController);
      if (!controller) return;
      signRoom(lawyer, pos.roomName);
      lawyer.claimController(controller);
    }
  }
}
