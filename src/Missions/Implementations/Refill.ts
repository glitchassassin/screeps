import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { minionCost } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getRefillTargets } from "Selectors/spawnsAndExtensionsDemand";
import { MissionImplementation } from "./MissionImplementation";

export interface RefillMission extends Mission<MissionType.REFILL> {
  data: {
    refillTarget?: string,
    carryCapacity: number
  }
}

export function createRefillMission(office: string): RefillMission {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority: 16,
    type: MissionType.REFILL,
    data: {
      carryCapacity: body.filter(p => p === CARRY).length * CARRY_CAPACITY,
    },
    estimate,
  })
}

export class Refill extends MissionImplementation {
  static spawn(mission: RefillMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `REFILL-${mission.office}-${Game.time % 10000}-${Math.floor(Math.random() * 100)}`
    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office));

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
    if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      setState(States.WITHDRAW)(creep);
    } else if (!creep.memory.state) {
      setState(States.DEPOSIT)(creep);
    }

    if (creep.memory.state === States.WITHDRAW) {
      const result = getEnergyFromStorage(creep, mission.office, 0)
      if (result === BehaviorResult.SUCCESS) {
        setState(States.DEPOSIT)(creep);
      } else if (result === BehaviorResult.FAILURE) {
        return;
      }
    }
    if (creep.memory.state === States.DEPOSIT) {
      // Short-circuit if everything is full
      if (Game.rooms[mission.office]?.energyAvailable === Game.rooms[mission.office]?.energyCapacityAvailable) return;

      if (!mission.data.refillTarget) {
        for (let s of getRefillTargets(mission.office)) {
          if (((s.structure as StructureExtension | StructureSpawn)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            mission.data.refillTarget = s.serialize();
            break;
          }
        }
      }

      if (!mission.data.refillTarget) {
        // No targets found.
        return
      }

      const target = PlannedStructure.deserialize(mission.data.refillTarget);

      if (!target.structure || (target.structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        // Re-target
        mission.data.refillTarget = undefined;
        return;
      }

      // Cleanup
      const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1).shift()
      if (tombstone) creep.withdraw(tombstone, RESOURCE_ENERGY)
      const res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: RESOURCE_ENERGY }).shift()
      if (res) creep.pickup(res)
      const extension = creep.pos.findInRange(
        FIND_MY_STRUCTURES,
        1,
        { filter: s => (s instanceof StructureSpawn || s instanceof StructureExtension || s instanceof StructureLab) && ((s.store as GenericStore).getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0 }
      )[0] as StructureSpawn | StructureExtension | undefined;

      if (extension) creep.transfer(extension, RESOURCE_ENERGY);

      if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        mission.data.refillTarget = undefined;
        return;
      }
    }
  }
}
