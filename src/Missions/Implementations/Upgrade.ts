import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { UPGRADE_CONTROLLER_COST } from "gameConstants";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { minionCost } from "Selectors/minionCostPerTick";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface UpgradeMission extends Mission<MissionType.UPGRADE> {
  data: {
    emergency?: boolean
  }
}

export function createUpgradeMission(office: string, emergency = false): UpgradeMission {
  const body = MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(office))
  const efficiency = roomPlans(office)?.headquarters?.storage.structure ? 1 : 0.5
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body) + (body.filter(p => p === WORK).length * CREEP_LIFE_TIME * efficiency),
  }

  return createMission({
    office,
    priority: emergency ? 15 : 8,
    type: MissionType.UPGRADE,
    data: {
      emergency
    },
    estimate,
  })
}

export class Upgrade extends MissionImplementation {
  static spawn(mission: UpgradeMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `PARALEGAL-${mission.office}-${Game.time % 10000}-${Math.floor(Math.random() * 100)}`
    const body = MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(mission.office));

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

  static minionLogic(mission: Mission<MissionType>, creep: Creep): void {
    // if (
    //   creep.memory.state === States.GET_BOOSTED
    // ) {
    //   if (getBoosted(creep) === BehaviorResult.INPROGRESS) {
    //     return;
    //   }
    //   setState(States.GET_ENERGY)(creep);
    // }
    // Do work
    if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      setState(States.GET_ENERGY)(creep);
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      setState(States.WORKING)(creep);
    }
    if (creep.memory.state === States.GET_ENERGY) {
      if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
        setState(States.WORKING)(creep);
      }
    }
    if (creep.memory.state === States.WORKING) {
      const controller = Game.rooms[mission.office]?.controller
      if (!controller) return;
      moveTo(creep, { pos: controller.pos, range: 3 });
      const result = creep.upgradeController(controller)
      if (result === ERR_NOT_ENOUGH_ENERGY) {
        setState(States.GET_ENERGY)(creep);
      } else if (result === OK) {
        let energyUsed = (UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER) * creep.body.filter(p => p.type === WORK).length;
        if (rcl(mission.office) === 8) energyUsed = Math.min(15, energyUsed);
        mission.actual.energy += energyUsed;
      }
    }
  }
}
