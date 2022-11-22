import { BehaviorResult } from 'Behaviors/Behavior';
import { engineerGetEnergy } from 'Behaviors/engineerGetEnergy';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { BARRIER_TYPES } from 'config';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget, getWithdrawLimit } from 'Missions/Budgets';
import { estimateMissionInterval } from 'Missions/Selectors';
import { EngineerQueue } from 'RoomPlanner/EngineerQueue';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { moveTo } from 'screeps-cartographer';
import { combatPower } from 'Selectors/Combat/combatStats';
import { isSpawned } from 'Selectors/isSpawned';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { CreepsThatNeedEnergy } from 'Selectors/storageStructureThatNeedsEnergy';
import { memoize, memoizeOnce, memoizeOncePerTick } from 'utils/memoizeFunction';

export interface EngineerMissionData extends BaseMissionData {
  assignments?: Record<
    string,
    {
      facilitiesTarget?: string;
    }
  >;
}

export class EngineerMission extends MissionImplementation {
  budget = Budget.EFFICIENCY;
  public creeps = {
    engineers: new MultiCreepSpawner('e', this.missionData.office, {
      role: MinionTypes.ENGINEER,
      budget: this.budget,
      builds: energy => MinionBuilders[MinionTypes.ENGINEER](energy, this.calculated().roads),
      count: current => {
        let pendingCost = this.queue.analysis().energyRemaining;
        // If rcl < 2, engineers will also upgrade
        if (rcl(this.missionData.office) < 2) {
          const controller = Game.rooms[this.missionData.office].controller;
          pendingCost += (controller?.progressTotal ?? 0) - (controller?.progress ?? 0);
        } else {
          // above RCL2, let repair work accumulate before spawning
          if (this.queue.build.size === 0 && pendingCost < 1500) {
            pendingCost = 0;
          }
        }
        if (this.estimatedEnergyRemaining < pendingCost) return 1;
        return 0;
      }
    })
  };

  priority = 8;
  queue: EngineerQueue;
  constructor(public missionData: EngineerMissionData, id?: string) {
    super(missionData, id);
    this.queue = new EngineerQueue(missionData.office);
  }
  static fromId(id: EngineerMission['id']) {
    return super.fromId(id) as EngineerMission;
  }

  calculated = memoizeOncePerTick(() => {
    return {
      roads: rcl(this.missionData.office) > 3
    };
  });

  engineerStats = memoize(
    (creepName: string) => creepName,
    (creepName: string) => {
      const creep = Game.creeps[creepName];
      const stats = combatPower(creep);
      return {
        buildTicks: stats.carry / stats.build,
        repairTicks: stats.carry / (stats.repair * REPAIR_COST),
        speed: stats.speed
      };
    }
  );

  updateEstimatedEnergy = memoizeOnce(() => {
    if (this.creeps.engineers.resolved.length === 0) {
      this.estimatedEnergyRemaining = 0;
      return;
    }
    const analysis = this.queue.analysis();
    let energy = analysis.energyRemaining / analysis.workTicksRemaining;
    if (isNaN(energy)) energy = 1;

    const RANGE_OFFSET = 1.5; // approximate the difference between path and range distance

    const workTicksRemaining = this.creeps.engineers.resolved
      .map(c => {
        const { buildTicks, repairTicks, speed } = this.engineerStats(c.name);
        const workTicks = energy < 3 ? repairTicks : buildTicks;
        const period = Math.min(estimateMissionInterval(this.missionData.office), c.ticksToLive ?? CREEP_LIFE_TIME);
        const iterationTime = workTicks + analysis.minRange * speed * 2 * RANGE_OFFSET;
        const iterations = period / iterationTime;
        const remaining = workTicks * iterations;
        if (isNaN(remaining)) return 0;
        return remaining;
      })
      .reduce(sum, 0);

    // add controller upgrading to total energy remaining
    let energyRemaining = analysis.energyRemaining;
    if (rcl(this.missionData.office) < 8) {
      const controller = Game.rooms[this.missionData.office].controller;
      energyRemaining += (controller?.progressTotal ?? 0) - (controller?.progress ?? 0);
    }

    this.estimatedEnergyRemaining = Math.min(energyRemaining, workTicksRemaining * energy);
  }, 100);

  run(creeps: ResolvedCreeps<EngineerMission>, missions: ResolvedMissions<EngineerMission>, data: EngineerMissionData) {
    this.queue.survey();

    const { engineers } = creeps;
    this.missionData.assignments ??= {};

    this.updateEstimatedEnergy();

    for (const creep of engineers.filter(isSpawned)) {
      this.missionData.assignments[creep.name] ??= {};
      const assignment = this.missionData.assignments[creep.name];
      if (rcl(this.missionData.office) < 4) {
        CreepsThatNeedEnergy.set(
          this.missionData.office,
          CreepsThatNeedEnergy.get(this.missionData.office) ?? new Set()
        );
        CreepsThatNeedEnergy.get(this.missionData.office)?.add(creep.name);
      } else {
        CreepsThatNeedEnergy.get(this.missionData.office)?.delete(creep.name);
      }
      runStates(
        {
          [States.FIND_WORK]: (mission, creep) => {
            delete mission.facilitiesTarget;
            const nextStructure = this.queue.getNextStructure(creep);
            if (nextStructure) {
              mission.facilitiesTarget = nextStructure.serialize();
              return States.BUILDING;
            }
            delete mission.facilitiesTarget;
            if (rcl(data.office) < 8) return States.UPGRADING;
            return States.RECYCLE;
          },
          [States.GET_ENERGY]: (mission, creep) => {
            const target = mission.facilitiesTarget
              ? PlannedStructure.deserialize(mission.facilitiesTarget)
              : undefined;
            if (
              creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 ||
              engineerGetEnergy(
                creep,
                data.office,
                Math.max(Game.rooms[data.office].energyCapacityAvailable, getWithdrawLimit(data.office, this.budget)),
                target?.pos.roomName !== this.missionData.office // currently building for a franchise
              ) === BehaviorResult.SUCCESS
            ) {
              return States.FIND_WORK;
            }
            return States.GET_ENERGY;
          },
          [States.BUILDING]: (mission, creep) => {
            if (!creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.GET_ENERGY;
            if (!mission.facilitiesTarget) return States.FIND_WORK;
            const plan = PlannedStructure.deserialize(mission.facilitiesTarget);

            plan.survey();

            if (!plan.energyToBuild && !plan.energyToRepair) {
              this.queue.complete(plan);
              return States.FIND_WORK;
            }

            if (!Game.rooms[plan.pos.roomName]?.controller?.my && Game.rooms[plan.pos.roomName]) {
              const obstacle = plan.pos
                .lookFor(LOOK_STRUCTURES)
                .find(s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD);
              if (obstacle) {
                moveTo(creep, { pos: plan.pos, range: 1 });
                if (creep.pos.inRangeTo(plan.pos, 1)) {
                  creep.dismantle(obstacle);
                }
                return States.BUILDING;
              }
            }

            moveTo(creep, { pos: plan.pos, range: 3 });

            if (creep.pos.inRangeTo(plan.pos, 3)) {
              if (plan.structure && plan.structure.hits < plan.structure.hitsMax) {
                if (creep.repair(plan.structure) === OK) {
                  const cost = REPAIR_COST * REPAIR_POWER * creep.body.filter(p => p.type === WORK).length;
                  this.recordEnergy(cost);
                  this.estimatedEnergyRemaining -= cost;
                  if (cost >= plan.energyToRepair) {
                    this.queue.complete(plan);
                    return States.FIND_WORK;
                  }
                }
              } else {
                // Create construction site if needed
                if (!plan.constructionSite) {
                  const result = plan.pos.createConstructionSite(plan.structureType);
                  if (result === ERR_NOT_OWNER) {
                    // room reserved or claimed by a hostile actor
                    delete mission.facilitiesTarget;
                    return States.FIND_WORK;
                  } else if (result !== OK) {
                    console.log('Error creating construction site', plan.pos, plan.structureType, result);
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
                    this.recordEnergy(cost);
                    this.estimatedEnergyRemaining -= cost;
                    if (cost >= plan.energyToBuild && !BARRIER_TYPES.includes(plan.structureType)) {
                      this.queue.complete(plan);
                      return States.FIND_WORK;
                    }
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
            if (
              rcl(data.office) >= 4 &&
              storageEnergyAvailable(data.office) <= getWithdrawLimit(data.office, this.budget)
            )
              return States.FIND_WORK;
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
              return States.GET_ENERGY;
            }

            // No construction - upgrade instead
            const controller = Game.rooms[data.office]?.controller;
            if (!controller) return States.FIND_WORK;
            moveTo(creep, { pos: controller.pos, range: 3 });
            const result = creep.upgradeController(controller);
            if (result == ERR_NOT_ENOUGH_ENERGY) {
              return States.GET_ENERGY;
            } else if (result === OK) {
              this.recordEnergy(
                UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length
              );
            }
            if (Game.time % 10 === 0) return States.FIND_WORK;
            return States.UPGRADING;
          },
          [States.RECYCLE]: (mission, creep) => recycle(this.missionData, creep)
        },
        assignment,
        creep
      );
    }

    this.estimatedEnergyRemaining = Math.max(0, this.estimatedEnergyRemaining);
  }
}
