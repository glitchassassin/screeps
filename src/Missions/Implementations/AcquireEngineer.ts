import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { minionCost } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { engineerLogic } from "./Engineer";
import { MissionImplementation } from "./MissionImplementation";

export interface AcquireEngineerMission extends Mission<MissionType.ACQUIRE_ENGINEER> {
  data: {
    facilitiesTarget?: string | undefined,
    workParts: number,
    targetOffice: string,
    initialized: boolean,
  }
}

export function createAcquireEngineerMission(office: string, targetOffice: string): AcquireEngineerMission {
  const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office));
  const capacity = body.filter(b => b === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.6,
    energy: minionCost(body) + capacity,
  }

  const workParts = body.filter(p => p === WORK).length;

  return createMission({
    office,
    priority: 5,
    type: MissionType.ACQUIRE_ENGINEER,
    data: {
      workParts,
      targetOffice,
      initialized: false
    },
    estimate,
  })
}

export class AcquireEngineer extends MissionImplementation {
  static spawn(mission: AcquireEngineerMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `ENGINEER-${mission.office}-${mission.id}`
    const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(mission.office));

    mission.data.workParts = body.filter(p => p === WORK).length;

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

  static minionLogic(mission: AcquireEngineerMission, creep: Creep) {
    if (!mission.data.initialized) {
      // Load up with energy from sponsor office
      if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
        mission.actual.energy += creep.store.getUsedCapacity(RESOURCE_ENERGY);
        mission.data.initialized = true;
      }
    } else {
      if (engineerLogic(creep, mission.data.targetOffice, mission)) {
        mission.efficiency.working += 1;
      }
    }
  }
}
