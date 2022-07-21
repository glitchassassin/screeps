import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { signRoom } from "Behaviors/signRoom";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { getFranchiseDistance } from "Selectors/getFranchiseDistance";
import { minionCost } from "Selectors/minionCostPerTick";
import { controllerPosition, sourceIds } from "Selectors/roomCache";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface ReserveMission extends Mission<MissionType.RESERVE> {
  data: {
    reserveTarget: string,
    arrived?: number,
  }
}

export function createReserveMission(office: string, reserveTarget: string): ReserveMission {
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(office))),
  }

  // set priority differently for remote sources
  const [source] = sourceIds(reserveTarget);
  const distance = getFranchiseDistance(office, source);
  let priority = 1;
  if (distance) {
    // Increase priority for closer franchises, up to 1 point for closer than 50 squares
    // Round priority to two places
    priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
  }

  return createMission({
    office,
    priority,
    type: MissionType.RESERVE,
    data: {
      reserveTarget
    },
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
    const controllerPos = controllerPosition(mission.data.reserveTarget)
    if (!controllerPos) return;

    // Move to controller
    if (moveTo(creep, { pos: controllerPos, range: 1 }) === BehaviorResult.SUCCESS) {
      // Set arrived timestamp when in range
      mission.data.arrived ??= Game.time;
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
