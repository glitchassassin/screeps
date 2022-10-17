import { BehaviorResult } from 'Behaviors/Behavior';
import { engineerGetEnergy } from 'Behaviors/engineerGetEnergy';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { getWithdrawLimit } from 'Missions/Budgets';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { activeMissions, estimateMissionInterval, isMission } from 'Missions/Selectors';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { moveTo } from 'screeps-cartographer';
import { franchisesThatNeedRoadWork } from 'Selectors/Franchises/franchisesThatNeedRoadWork';
import { franchiseThatNeedsEngineers } from 'Selectors/Franchises/franchiseThatNeedsEngineers';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { franchiseRoadsToBuild } from 'Selectors/plannedTerritoryRoads';
import { rcl } from 'Selectors/rcl';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { facilitiesEfficiency } from 'Selectors/Structures/facilitiesEfficiency';
import { facilitiesWorkToDo, plannedStructureNeedsWork } from 'Selectors/Structures/facilitiesWorkToDo';
import { MissionImplementation } from './MissionImplementation';

interface EngineerMissionData {
  facilitiesTarget?: string | undefined;
  franchise?: Id<Source> | undefined;
  workParts: number;
}

export interface EngineerMission extends Mission<MissionType.ENGINEER> {
  data: EngineerMissionData;
}

export function createEngineerOrder(office: string, franchise?: Id<Source>): SpawnOrder {
  // Scale engineer by available room energy

  const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office), rcl(office) >= 3, !franchise);
  const efficiencyAdjustment = facilitiesEfficiency(office, body);

  const workEfficiency = body.filter(p => p === WORK).length * efficiencyAdjustment;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: workEfficiency * estimateMissionInterval(office)
  };

  const workParts = body.filter(p => p === WORK).length;

  const mission = createMission({
    office,
    priority: 8,
    type: MissionType.ENGINEER,
    data: {
      workParts,
      franchise
    },
    estimate
  });

  const name = `ENGINEER-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body
  });
}

export class Engineer extends MissionImplementation {
  static minionLogic(mission: EngineerMission, creep: Creep) {
    // Adjust estimate, if needed
    const lifetime = Math.min(estimateMissionInterval(mission.office), creep.ticksToLive ?? 0);
    const workParts = creep.body.filter(p => p.type === WORK).length;
    mission.estimate.energy =
      mission.actual.energy +
      lifetime *
        workParts *
        facilitiesEfficiency(
          mission.office,
          creep.body.map(p => p.type)
        );

    // Run logic
    engineerLogic(mission, creep);
  }
}

const engineerLogic = (mission: EngineerMission, creep: Creep) => {
  runStates(
    {
      [States.FIND_WORK]: (mission, creep) => {
        delete mission.data.facilitiesTarget;
        const nextStructure = getClosestByRange(creep.pos, facilitiesWorkToDo(mission.office));
        if (nextStructure) {
          mission.data.facilitiesTarget = nextStructure.serialize();
          delete mission.data.franchise;
          return States.BUILDING;
        }
        if (rcl(mission.office) < 3) {
          // Skip building roads until RCL3
          delete mission.data.facilitiesTarget;
          return States.UPGRADING;
        }

        // Pick a road to work on
        if (!mission.data.franchise || !franchisesThatNeedRoadWork(mission.office).includes(mission.data.franchise)) {
          delete mission.data.franchise;
          mission.data.franchise = franchiseThatNeedsEngineers(
            mission.office,
            activeMissions(mission.office).filter(isMission(MissionType.ENGINEER)),
            true
          );
        }

        if (!mission.data.franchise) return States.UPGRADING; // go upgrade instead

        // Pick the next section of road to complete
        const road = getClosestByRange(creep.pos, franchiseRoadsToBuild(mission.office, mission.data.franchise));
        if (road) {
          mission.data.facilitiesTarget = road.serialize();
          return States.BUILDING;
        }

        // No work found for this franchise
        delete mission.data.franchise;
        return States.UPGRADING;
      },
      [States.GET_ENERGY]: (mission, creep) => {
        if (
          creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 ||
          engineerGetEnergy(
            creep,
            mission.office,
            getWithdrawLimit(mission),
            !!mission.data.franchise && !!mission.data.facilitiesTarget // currently building for a franchise
          ) === BehaviorResult.SUCCESS
        ) {
          return States.FIND_WORK;
        }
        return States.GET_ENERGY;
      },
      [States.BUILDING]: (mission, creep) => {
        if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.GET_ENERGY;
        if (!mission.data.facilitiesTarget) return States.FIND_WORK;
        const plan = PlannedStructure.deserialize(mission.data.facilitiesTarget);

        if (!plannedStructureNeedsWork(plan, true)) return States.FIND_WORK;

        if (!Game.rooms[plan.pos.roomName]?.controller?.my && Game.rooms[plan.pos.roomName]) {
          const obstacle = plan.pos
            .lookFor(LOOK_STRUCTURES)
            .find(s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD);
          if (obstacle) {
            moveTo(creep, { pos: plan.pos, range: 1 });
            if (creep.pos.inRangeTo(plan.pos, 1)) {
              if (creep.dismantle(obstacle) === OK) mission.efficiency.working += 1;
            }
            return States.BUILDING;
          }
        }

        moveTo(creep, { pos: plan.pos, range: 3 });

        if (creep.pos.inRangeTo(plan.pos, 3)) {
          if (plan.structure && plan.structure.hits < plan.structure.hitsMax) {
            if (mission.data.franchise) {
              // engineers should not be repairing
              return States.FIND_WORK;
            }
            if (creep.repair(plan.structure) === OK) {
              const cost = REPAIR_COST * REPAIR_POWER * creep.body.filter(p => p.type === WORK).length;
              mission.actual.energy += cost;
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
              const fleeCreep = plan.pos.lookFor(LOOK_CREEPS)[0];
              if (fleeCreep) moveTo(fleeCreep, { pos: plan.pos, range: 2 }, { flee: true });
            }
            if (plan.constructionSite) {
              const result = creep.build(plan.constructionSite);
              if (result === OK) {
                const cost = BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
                mission.actual.energy += cost;
                mission.efficiency.working += 1;
              } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                return States.GET_ENERGY;
              }
            }
          }
          plan.survey();
        }

        return States.BUILDING;
      },
      [States.UPGRADING]: (mission, creep) => {
        if (rcl(mission.office) >= 4 && storageEnergyAvailable(mission.office) <= getWithdrawLimit(mission))
          return States.FIND_WORK;

        // No construction - upgrade instead
        const controller = Game.rooms[mission.office]?.controller;
        if (!controller) return States.FIND_WORK;
        moveTo(creep, { pos: controller.pos, range: 3 });
        const result = creep.upgradeController(controller);
        if (result == ERR_NOT_ENOUGH_ENERGY) {
          return States.FIND_WORK;
        } else if (result === OK) {
          mission.actual.energy +=
            UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length;
          mission.efficiency.working += 1;
        }
        if (Game.time % 10 === 0) return States.FIND_WORK;
        return States.UPGRADING;
      }
    },
    mission,
    creep
  );
};
