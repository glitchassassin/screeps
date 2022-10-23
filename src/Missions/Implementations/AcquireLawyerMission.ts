import { signRoom } from 'Behaviors/signRoom';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
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

export interface AcquireLawyerMissionData extends BaseMissionData {
  targetOffice: string;
  targetController?: Id<StructureController>;
}

export class AcquireLawyerMission extends MissionImplementation {
  budget = Budget.ECONOMY;
  public creeps = {
    lawyer: new CreepSpawner('e', this.missionData.office, {
      role: MinionTypes.LAWYER,
      budget: this.budget,
      body: energy => MinionBuilders[MinionTypes.LAWYER](energy)
    })
  };

  priority = 8.2;

  constructor(public missionData: AcquireLawyerMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: AcquireLawyerMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  run(
    creeps: ResolvedCreeps<AcquireLawyerMission>,
    missions: ResolvedMissions<AcquireLawyerMission>,
    data: AcquireLawyerMissionData
  ) {
    const { lawyer } = creeps;
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
