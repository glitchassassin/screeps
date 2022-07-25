import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { signRoom } from "Behaviors/signRoom";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionStatus, MissionType } from "Missions/Mission";
import { byId } from "Selectors/byId";
import { minionCost } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface AcquireLawyerMission extends Mission<MissionType.ACQUIRE_LAWYER> {
  data: {
    targetOffice: string,
    targetController?: Id<StructureController>
  }
}

export function createAcquireLawyerMission(office: string, targetOffice: string): AcquireLawyerMission {
  const body = MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_CLAIM_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority: 5.2,
    type: MissionType.ACQUIRE_LAWYER,
    data: {
      targetOffice,
    },
    estimate,
  })
}

export class AcquireLawyer extends MissionImplementation {
  static spawn(mission: AcquireLawyerMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `LAWYER-${mission.office}-${mission.id}`
    const body = MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(mission.office));

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body,
      }
    )

    mission.creepNames.push(name);
  }

  static minionLogic(mission: AcquireLawyerMission, creep: Creep) {
    if (mission.data.targetOffice && Memory.rooms[mission.data.targetOffice]) {
      Memory.rooms[mission.data.targetOffice].lastAcquireAttempt = Game.time;
    }

    mission.data.targetController ??= Memory.rooms[mission.data.targetOffice].controllerId ?? Game.rooms[mission.data.targetOffice]?.controller?.id;
    if (byId(mission.data.targetController)?.my) {
      mission.status = MissionStatus.DONE; // Already claimed this controller
      return;
    }

    const pos = posById(mission.data.targetController)
    if (!pos) {
      // Not sure where controller is, move to room instead
      moveTo(creep, { pos: new RoomPosition(25, 25, mission.data.targetOffice), range: 20 });
      return;
    }

    const result = moveTo(creep, { pos, range: 1 });
    if (result === BehaviorResult.SUCCESS) {
      const controller = byId(mission.data.targetController)
      if (!controller) return;
      signRoom(creep, pos.roomName);
      creep.claimController(controller);
      mission.efficiency.working += 1;
    }
  }
}
