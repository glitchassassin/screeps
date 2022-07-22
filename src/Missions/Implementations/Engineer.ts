import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { runStates } from "Behaviors/stateMachine";
import { States } from "Behaviors/states";
import { UPGRADE_CONTROLLER_COST } from "gameConstants";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { getWithdrawLimit } from "Missions/Budgets";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { activeMissions, estimateMissionInterval, isMission } from "Missions/Selectors";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { facilitiesEfficiency, facilitiesWorkToDo, plannedStructureNeedsWork } from "Selectors/facilitiesWorkToDo";
import { franchiseThatNeedsEngineers } from "Selectors/franchiseThatNeedsEngineers";
import { minionCost } from "Selectors/minionCostPerTick";
import { franchisesThatNeedRoadWork, plannedFranchiseRoads } from "Selectors/plannedTerritoryRoads";
import { rcl } from "Selectors/rcl";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

interface EngineerMissionData {
  facilitiesTarget?: string | undefined,
  franchise?: Id<Source> | undefined,
  workParts: number,
}

export interface EngineerMission extends Mission<MissionType.ENGINEER> {
  data: EngineerMissionData
}

export function createEngineerMission(office: string, franchise?: Id<Source>): EngineerMission {
  // Scale engineer by available room energy
  const efficiencyAdjustment = facilitiesEfficiency(office);
  const maxWork = Math.max(1, Math.floor((Game.rooms[office].energyCapacityAvailable * 5) / (CREEP_LIFE_TIME * efficiencyAdjustment)));

  const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office), maxWork);

  const workEfficiency = body.filter(p => p === WORK).length * efficiencyAdjustment;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body) + (workEfficiency * estimateMissionInterval(office)),
  }

  const workParts = body.filter(p => p === WORK).length;

  return createMission({
    office,
    priority: 9,
    type: MissionType.ENGINEER,
    data: {
      workParts,
      franchise
    },
    estimate,
  })
}

export class Engineer extends MissionImplementation {
  static spawn(mission: EngineerMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `ENGINEER-${mission.office}-${mission.id}`
    const efficiencyAdjustment = facilitiesEfficiency(mission.office);
    const maxWork = Math.max(1, Math.floor((Game.rooms[mission.office].energyCapacityAvailable * 5) / (CREEP_LIFE_TIME * efficiencyAdjustment)));

    const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(mission.office), maxWork);


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
    // Adjust estimate, if needed
    const lifetime = Math.min(estimateMissionInterval(mission.office), (creep.ticksToLive ?? 0));
    const workParts = creep.body.filter(p => p.type === WORK).length
    mission.estimate.energy = mission.actual.energy + lifetime * workParts * facilitiesEfficiency(mission.office);

    // Run logic
    engineerLogic(mission, creep);
  }
}

const engineerLogic = (mission: EngineerMission, creep: Creep) => {
  runStates({
    [States.FIND_WORK]: (mission, creep) => {
      delete mission.data.facilitiesTarget;
      const nextStructure = facilitiesWorkToDo(mission.office)[0];
      if (nextStructure) {
        mission.data.facilitiesTarget = nextStructure.serialize();
        delete mission.data.franchise;
        return States.GET_ENERGY;
      }
      if (rcl(mission.office) < 3) {
        // Skip building roads until RCL3
        delete mission.data.facilitiesTarget;
        return States.GET_ENERGY;
      }

      // Pick a road to work on
      if (!mission.data.franchise || !franchisesThatNeedRoadWork(mission.office).includes(mission.data.franchise)) {
        delete mission.data.franchise;
        mission.data.franchise = franchiseThatNeedsEngineers(mission.office, activeMissions(mission.office).filter(isMission(MissionType.ENGINEER)), true);
      }

      if (!mission.data.franchise) return States.GET_ENERGY; // go upgrade instead

      // Pick the next section of road to complete
      const road = plannedFranchiseRoads(mission.office, mission.data.franchise).find(s => plannedStructureNeedsWork(s));
      if (road) {
        mission.data.facilitiesTarget = road.serialize();
        return States.GET_ENERGY;
      }

      // No work found for this franchise
      delete mission.data.franchise
      return States.FIND_WORK;
    },
    [States.GET_ENERGY]: (mission, creep) => {
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) || engineerGetEnergy(creep, mission.office, getWithdrawLimit(mission)) === BehaviorResult.SUCCESS) {
        return mission.data.facilitiesTarget ? States.BUILDING : States.UPGRADING;
      }
      return States.GET_ENERGY;
    },
    [States.BUILDING]: (mission, creep) => {
      if (!mission.data.facilitiesTarget) return States.FIND_WORK;
      const plan = PlannedStructure.deserialize(mission.data.facilitiesTarget)

      if (!plannedStructureNeedsWork(plan, true)) return States.FIND_WORK;

      new RoomVisual(plan.pos.roomName).line(creep.pos, plan.pos, { color: 'cyan' })

      if (!Game.rooms[plan.pos.roomName]?.controller?.my && Game.rooms[plan.pos.roomName]) {
        const obstacle = plan.pos.lookFor(LOOK_STRUCTURES)
          .find(s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD)
        if (obstacle) {
          if (moveTo(creep, { pos: plan.pos, range: 1 }) === BehaviorResult.SUCCESS) {
            if (creep.dismantle(obstacle) === OK) mission.efficiency.working += 1;
          }
          return States.BUILDING;
        }
      }

      if (moveTo(creep, { pos: plan.pos, range: 3 }) === BehaviorResult.SUCCESS) {
        if (plan.structure) {
          if (creep.repair(plan.structure) === OK) {
            mission.actual.energy += (REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length;
            mission.efficiency.working += 1;
          }
        } else {
          // Create construction site if needed
          if (!plan.constructionSite) {
            const result = plan.pos.createConstructionSite(plan.structureType);
            if (result === ERR_NOT_OWNER) {
              // room reserved or claimed by a hostile actor
              delete mission.data.facilitiesTarget;
              return States.FIND_WORK;
            }
          }
          // Shove creeps out of the way if needed
          if ((OBSTACLE_OBJECT_TYPES as string[]).includes(plan.structureType)) {
            plan.pos.lookFor(LOOK_CREEPS)[0]?.giveWay();
          }
          if (plan.constructionSite) {
            const result = creep.build(plan.constructionSite)
            if (result === OK) {
              mission.actual.energy += BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
              mission.efficiency.working += 1;
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
              return States.GET_ENERGY;
            }
          }
        }
        plan.survey()
      }

      return States.BUILDING;
    },
    [States.UPGRADING]: (mission, creep) => {
      if (
        rcl(mission.office) >= 4 &&
        storageEnergyAvailable(mission.office) <= getWithdrawLimit(mission)
      ) return States.FIND_WORK;

      // No construction - upgrade instead
      const controller = Game.rooms[mission.office]?.controller
      if (!controller) return States.FIND_WORK;
      moveTo(creep, { pos: controller.pos, range: 3 });
      const result = creep.upgradeController(controller);
      if (result == ERR_NOT_ENOUGH_ENERGY) {
        return States.FIND_WORK;
      } else if (result === OK) {
        mission.actual.energy += (UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER) * creep.body.filter(p => p.type === WORK).length
        mission.efficiency.working += 1;
      }
      return States.UPGRADING;
    }
  }, mission, creep)
}
