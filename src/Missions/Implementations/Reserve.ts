import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { minionCost } from "Selectors/minionCostPerTick";
import { controllerPosition } from "Selectors/roomCache";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface ReserveMission extends Mission<MissionType.RESERVE> {
  data: {
    reserveTarget: string,
    arrived?: number,
  }
}

export function createReserveMission(office: string, reserveTarget: string, priority: number): ReserveMission {
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(office))),
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
      if (controller) creep.reserveController(controller);
    }
  }
}
