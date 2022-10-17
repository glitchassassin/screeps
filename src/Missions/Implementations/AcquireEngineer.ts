import { BehaviorResult } from 'Behaviors/Behavior';
import { engineerGetEnergy } from 'Behaviors/engineerGetEnergy';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { setState, States } from 'Behaviors/states';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { getWithdrawLimit } from 'Missions/Budgets';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { assignCreepToOffice } from 'Missions/Selectors';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { moveTo } from 'screeps-cartographer';
import { rcl } from 'Selectors/rcl';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { facilitiesWorkToDo, plannedStructureNeedsWork } from 'Selectors/Structures/facilitiesWorkToDo';
import { createEngineerOrder } from './Engineer';
import { MissionImplementation } from './MissionImplementation';

export interface AcquireEngineerMission extends Mission<MissionType.ACQUIRE_ENGINEER> {
  data: {
    facilitiesTarget?: string | undefined;
    workParts: number;
    targetOffice: string;
    initialized: boolean;
  };
}

export function createAcquireEngineerOrder(office: string, targetOffice: string): SpawnOrder {
  const body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office));
  const capacity = body.filter(b => b === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.6,
    energy: capacity
  };

  const workParts = body.filter(p => p === WORK).length;

  const mission = createMission({
    office,
    priority: 8.1,
    type: MissionType.ACQUIRE_ENGINEER,
    data: {
      workParts,
      targetOffice,
      initialized: false
    },
    estimate
  });

  // Set name
  const name = `ENGINEER-${mission.office}-${mission.id}`;

  mission.data.workParts = body.filter(p => p === WORK).length;

  return createSpawnOrder(mission, {
    name,
    body
  });
}

export class AcquireEngineer extends MissionImplementation {
  static minionLogic(mission: AcquireEngineerMission, creep: Creep) {
    if (!mission.data.initialized) {
      // Load up with energy from sponsor office
      if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
        mission.actual.energy += creep.store.getUsedCapacity(RESOURCE_ENERGY);
        mission.data.initialized = true;
      }
    } else {
      assignCreepToOffice(creep, mission.data.targetOffice);
      creep.memory.mission = createEngineerOrder(mission.data.targetOffice).mission;
    }
  }
}

const engineerLogic = (creep: Creep, office: string, mission: AcquireEngineerMission) => {
  let facilitiesTarget;
  // Check target for completion
  if (mission.data.facilitiesTarget) {
    facilitiesTarget = PlannedStructure.deserialize(mission.data.facilitiesTarget);
    if (!plannedStructureNeedsWork(facilitiesTarget, true)) {
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
      (rcl(office) < 4 || storageEnergyAvailable(office) > getWithdrawLimit(mission))
    ) {
      // No construction - upgrade instead
      const controller = Game.rooms[office]?.controller;
      if (!controller) return 0;
      moveTo(creep, { pos: controller.pos, range: 3 });
      const result = creep.upgradeController(controller);
      if (result == ERR_NOT_ENOUGH_ENERGY) {
        setState(States.GET_ENERGY)(creep);
      } else if (result === OK) {
        return UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length;
      }
    } else if (mission.data.facilitiesTarget) {
      const plan = PlannedStructure.deserialize(mission.data.facilitiesTarget);
      // console.log(creep.name, plan.pos, plan.structureType);

      if (!Game.rooms[plan.pos.roomName]?.controller?.my && Game.rooms[plan.pos.roomName]) {
        const obstacle = plan.pos
          .lookFor(LOOK_STRUCTURES)
          .find(s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD);
        if (obstacle) {
          moveTo(creep, { pos: plan.pos, range: 1 });
          creep.dismantle(obstacle);
        }
      }

      moveTo(creep, { pos: plan.pos, range: 3 });

      if (creep.pos.inRangeTo(plan.pos, 3)) {
        if (plan.structure) {
          if (creep.repair(plan.structure) === OK) {
            return REPAIR_COST * REPAIR_POWER * creep.body.filter(p => p.type === WORK).length;
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
            const fleeCreep = plan.pos.lookFor(LOOK_CREEPS)[0];
            if (fleeCreep) moveTo(fleeCreep, { pos: plan.pos, range: 2 }, { flee: true });
          }
          if (plan.constructionSite) {
            if (creep.build(plan.constructionSite) === OK) {
              return BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
            }
          }
        }
        plan.survey();
      }
    }
  }
  return 0;
};
