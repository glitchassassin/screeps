import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { signRoom } from "Behaviors/signRoom";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { activeMissions, assignedCreep, isMission, missionExpired } from "Missions/Selectors";
import { minionCost } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { controllerPosition } from "Selectors/roomCache";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface ReserveMission extends Mission<MissionType.RESERVE> {
  data: {
    reserveTarget?: string,
    arrived?: number,
  }
}

export function createReserveMission(office: string): ReserveMission {
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(office))),
  }

  return createMission({
    office,
    priority: 9,
    type: MissionType.RESERVE,
    data: {},
    estimate,
  })
}

export class Reserve extends MissionImplementation {
  static spawn(mission: ReserveMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `MARKETER-${mission.office}-${mission.id}`
    const body = MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(mission.office));

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

  static minionLogic(mission: ReserveMission, creep: Creep): void {
    if (!mission.data.reserveTarget) {
      // Select reserve target
      const currentMissions = activeMissions(mission.office).filter(isMission(MissionType.RESERVE));
      const harvestMissions = activeMissions(mission.office).filter(isMission(MissionType.HARVEST))
      const potentialTargets = harvestMissions.filter(h => {
        const sourcePos = posById(h.data.source);
        if (!sourcePos || sourcePos.roomName === h.office) return false;
               // Not currently being reserved
        return currentMissions.every(m => sourcePos.roomName !== m.data.reserveTarget || missionExpired(m)) &&
               // Has less than 3000 ticks of reservation
               !((Memory.rooms[sourcePos.roomName].reserver === 'LordGreywether' && (Memory.rooms[sourcePos.roomName].reservation ?? 0) >= 3000))
      });

      if (!potentialTargets.length) return;

      // best targets have a harvester that will outlive the claimer
      let bestTargets = potentialTargets.filter(h => assignedCreep(h)?.ticksToLive && assignedCreep(h)!.ticksToLive! > CREEP_CLAIM_LIFE_TIME)
      if (!bestTargets.length) bestTargets = potentialTargets;

      const closestTarget = bestTargets.reduce((a, b) => (a.data.distance ?? Infinity) < (b.data.distance ?? Infinity) ? a : b);
      const room = posById(closestTarget.data.source)?.roomName;
      if (!room) return;
      mission.data.reserveTarget = room;
    }

    // Reserve target
    const controllerPos = controllerPosition(mission.data.reserveTarget)
    if (!controllerPos) return;

    if (creep.pos.getRangeTo(controllerPos) <= 2) {
      // Set arrived timestamp when in range
      mission.data.arrived ??= CREEP_CLAIM_LIFE_TIME - (creep.ticksToLive ?? CREEP_CLAIM_LIFE_TIME);
    }

    // Move to controller
    if (moveTo(creep, { pos: controllerPos, range: 1 }) === BehaviorResult.SUCCESS) {
      // Reserve controller
      const controller = Game.rooms[mission.data.reserveTarget].controller
      if (controller) {
        if (creep.reserveController(controller) === OK) {
          mission.efficiency.working += 1;
        }
      }
      signRoom(creep, mission.data.reserveTarget);
    }
  }
}
