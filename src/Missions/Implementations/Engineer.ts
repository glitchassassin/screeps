import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { UPGRADE_CONTROLLER_COST } from "gameConstants";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { getWithdrawLimit } from "Missions/Budgets";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { facilitiesEfficiency, facilitiesWorkToDo, plannedStructureNeedsWork } from "Selectors/facilitiesWorkToDo";
import { minionCost } from "Selectors/minionCostPerTick";
import { rcl } from "Selectors/rcl";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

interface EngineerMissionData {
  facilitiesTarget?: string | undefined,
  workParts: number,
}

export interface EngineerMission extends Mission<MissionType.ENGINEER> {
  data: EngineerMissionData
}

export function createEngineerMission(office: string): EngineerMission {
  // Scale engineer by available room energy
  const efficiencyAdjustment = facilitiesEfficiency(office);
  const maxWork = Math.max(1, Math.floor((Game.rooms[office].energyCapacityAvailable * 5) / (CREEP_LIFE_TIME * efficiencyAdjustment)));

  const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office), maxWork);

  const workEfficiency = body.filter(p => p === WORK).length * efficiencyAdjustment;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body) + (workEfficiency * CREEP_LIFE_TIME),
  }

  const workParts = body.filter(p => p === WORK).length;

  return createMission({
    office,
    priority: 9,
    type: MissionType.ENGINEER,
    data: {
      workParts
    },
    estimate,
  })
}

export class Engineer extends MissionImplementation {
  static spawn(mission: EngineerMission) {
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

  static minionLogic(mission: EngineerMission, creep: Creep) {
    const energyUsed = engineerLogic(creep, mission.office, mission);
    mission.actual.energy += energyUsed
    if (energyUsed) mission.efficiency.working += 1;
  }
}

export const engineerLogic = (creep: Creep, office: string, mission: Mission<MissionType> & { data: EngineerMissionData }) => {
  let facilitiesTarget;
  // Check target for completion
  if (mission.data.facilitiesTarget) {
    facilitiesTarget = PlannedStructure.deserialize(mission.data.facilitiesTarget)
    if (!plannedStructureNeedsWork(facilitiesTarget, 1.0)) {
      mission.data.facilitiesTarget = undefined;
    }
  }

  // Select a target
  if (!mission.data.facilitiesTarget) {
    facilitiesTarget = facilitiesWorkToDo(office)[0];
    if (facilitiesTarget) {
      mission.data.facilitiesTarget = facilitiesTarget.serialize();
    }
  }

  // Do work
  if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    setState(States.GET_ENERGY)(creep);
  }
  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
    setState(States.WORKING)(creep);
  }
  if (creep.memory.state === States.GET_ENERGY) {
    if (engineerGetEnergy(creep, office, getWithdrawLimit(mission)) === BehaviorResult.SUCCESS) {
      setState(States.WORKING)(creep);
    }
  }
  if (creep.memory.state === States.WORKING) {
    if (
      !mission.data.facilitiesTarget &&
      (
        rcl(office) < 4 ||
        storageEnergyAvailable(office) > getWithdrawLimit(mission)
      )
    ) {
      // No construction - upgrade instead
      const controller = Game.rooms[office]?.controller
      if (!controller) return 0;
      moveTo(creep, { pos: controller.pos, range: 3 });
      const result = creep.upgradeController(controller);
      if (result == ERR_NOT_ENOUGH_ENERGY) {
        setState(States.GET_ENERGY)(creep);
      } else if (result === OK) {
        return (UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER) * creep.body.filter(p => p.type === WORK).length
      }
    } else if (mission.data.facilitiesTarget) {
      const plan = PlannedStructure.deserialize(mission.data.facilitiesTarget)
      // console.log(creep.name, plan.pos, plan.structureType);

      if (!Game.rooms[plan.pos.roomName]?.controller?.my && Game.rooms[plan.pos.roomName]) {
        const obstacle = plan.pos.lookFor(LOOK_STRUCTURES)
          .find(s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD)
        if (obstacle && moveTo(creep, { pos: plan.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.dismantle(obstacle);
        }
      }

      if (moveTo(creep, { pos: plan.pos, range: 3 }) === BehaviorResult.SUCCESS) {
        if (plan.structure) {
          if (creep.repair(plan.structure) === OK) {
            return (REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length;
          }
        } else {
          // Create construction site if needed
          const result = plan.pos.createConstructionSite(plan.structureType);
          if (result === ERR_NOT_OWNER) {
            // room reserved or claimed by a hostile actor
            delete mission.data.facilitiesTarget;
            return 0;
          }
          // Shove creeps out of the way if needed
          if ((OBSTACLE_OBJECT_TYPES as string[]).includes(plan.structureType)) {
            plan.pos.lookFor(LOOK_CREEPS)[0]?.giveWay();
          }
          if (plan.constructionSite) {
            if (creep.build(plan.constructionSite) === OK) {
              return BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
            }
          }
        }
        plan.survey()
      }
    }
  }
  return 0;
}
