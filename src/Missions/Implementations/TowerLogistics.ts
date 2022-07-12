import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { getTowerRefillerLocation } from "Selectors/getHqLocations";
import { minionCost } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface TowerLogisticsMission extends Mission<MissionType.TOWER_LOGISTICS> {
  data: {}
}

// TODO - Make the filling more CPU-efficient. Refill once every 100 ticks or so. Track the last
// time a tower was filled.

export function createTowerLogisticsMission(office: string): TowerLogisticsMission {
  const body = MinionBuilders[MinionTypes.CLERK](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority: 15,
    type: MissionType.TOWER_LOGISTICS,
    data: {},
    estimate,
  })
}

export class TowerLogistics extends MissionImplementation {
  static spawn(mission: TowerLogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const pos = getTowerRefillerLocation(mission.office);
    const spawn = roomPlans(mission.office)?.headquarters?.spawn.structure as StructureSpawn;
    if (!pos || !spawn) return;
    const storage = roomPlans(mission.office)?.headquarters?.storage.structure;

    const body = MinionBuilders[storage ? MinionTypes.CLERK : MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office));

    // Set name
    const name = `CLERK-${mission.office}-${mission.id}`

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body,
      },
      mission.startTime,
      {
        spawn: spawn.id,
        directions: [spawn.pos.getDirectionTo(pos)]
      }
    )

    mission.creepNames.push(name);
  }

  static minionLogic(mission: TowerLogisticsMission, creep: Creep): void {
    // Priorities:
    // Link -> Storage
    // Storage <-> Terminal (energy)
    // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

    // Check HQ state
    const hq = roomPlans(mission.office)?.headquarters;
    if (!hq) return;
    const creepIsEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;

    if (!creep.memory.state) {
      if (creepIsEmpty) {
        setState(States.GET_ENERGY_STORAGE)(creep);
      } else {
        setState(States.FILL_TOWERS)(creep);
      }
    }
    if (creep.memory.state === States.GET_ENERGY_STORAGE) {
      const result = getEnergyFromStorage(creep, mission.office)
      if (result === BehaviorResult.SUCCESS) {
        setState(States.FILL_TOWERS)(creep);
      }
    }
    if (creep.memory.state === States.FILL_TOWERS) {
      if (creepIsEmpty) {
        setState(States.GET_ENERGY_STORAGE)(creep);
        return;
      }
      const towers = hq.towers.filter(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0);
      for (const {structure} of towers) {
        if (structure) creep.transfer(structure, RESOURCE_ENERGY);
      }
    }
  }
}
