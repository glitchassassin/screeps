import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { buildAccountant } from 'Minions/Builds/accountant';
import { buildEngineer } from 'Minions/Builds/engineer';
import { MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import { ResolvedCreeps, ResolvedMissions } from 'Missions/BaseClasses/MissionImplementation';
import { Budget, getWithdrawLimit } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { estimateMissionInterval } from 'Missions/Selectors';
import { EngineerQueue } from 'RoomPlanner/EngineerQueue';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { combatPower } from 'Selectors/Combat/combatStats';
import { estimatedFreeCapacity } from 'Selectors/Logistics/predictiveCapacity';
import { isSpawned } from 'Selectors/isSpawned';
import { plannedStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { roomPlans } from 'Selectors/roomPlans';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { officeShouldSupportAcquireTarget } from 'Strategy/Acquire/findAcquireTarget';
import { ACQUIRE_MAX_RCL, BARRIER_TYPES } from 'config';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { cachePath, moveByPath, moveTo } from 'screeps-cartographer';
import { memoizeOnce, memoizeOncePerTick } from 'utils/memoizeFunction';
import { EngineerMission, EngineerMissionData } from './EngineerMission';

export interface AcquireEngineerMissionData extends EngineerMissionData {
  initialized?: string[];
  targetOffice: string;
  targetHaulingCapacity?: number;
  actualHaulingCapacity?: number;
  facilitiesTarget?: string;
}

export class AcquireEngineerMission extends EngineerMission {
  budget = Budget.ESSENTIAL;
  public creeps = {
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      builds: energy => buildAccountant(energy, 25, false, false),
      count: current => {
        if (this.missionData.targetHaulingCapacity === undefined) return 0;
        if (current.map(c => combatPower(c).carry).reduce(sum, 0) >= this.missionData.targetHaulingCapacity) return 0;
        return 1;
      },
      estimatedCpuPerTick: 1
    }),
    engineers: new MultiCreepSpawner('e', this.missionData.office, {
      role: MinionTypes.ENGINEER,
      builds: energy => buildEngineer(energy, false, true),
      estimatedCpuPerTick: 1,
      count: current => {
        if (!officeShouldSupportAcquireTarget(this.missionData.office)) return 0;
        if (current.length) {
          // wait for haulers to catch up
          if (!this.missionData.actualHaulingCapacity || !this.missionData.targetHaulingCapacity) return 0;
          if (this.missionData.actualHaulingCapacity < this.missionData.targetHaulingCapacity) return 0;
        }
        return 1;
      }
    })
  };

  priority = 7.5;
  queue: EngineerQueue;
  constructor(
    public missionData: AcquireEngineerMissionData,
    id?: string
  ) {
    super(missionData, id);
    this.queue = new EngineerQueue(missionData.targetOffice);
  }

  static fromId(id: AcquireEngineerMission['id']) {
    return super.fromId(id) as AcquireEngineerMission;
  }

  updateEstimatedEnergy = memoizeOnce(() => {
    if (this.creeps.engineers.resolved.length === 0) {
      this.estimatedEnergyRemaining = 0;
      return;
    }
    const analysis = this.queue.analysis();
    let energy = analysis.energyRemaining / analysis.workTicksRemaining;
    if (isNaN(energy)) energy = 1;

    const workTicksRemaining = this.creeps.engineers.resolved
      .map(c => {
        const { buildTicks, repairTicks } = this.engineerStats(c.name);
        const workTicks = energy < 3 ? repairTicks : buildTicks;
        const period = Math.min(estimateMissionInterval(this.missionData.office), c.ticksToLive ?? CREEP_LIFE_TIME);
        const remaining = workTicks * period;
        if (isNaN(remaining)) return 0;
        return remaining;
      })
      .reduce(sum, 0);

    // add controller upgrading to total energy remaining
    let energyRemaining = analysis.energyRemaining;
    if (rcl(this.missionData.targetOffice) < 4) {
      const controller = Game.rooms[this.missionData.targetOffice].controller;
      energyRemaining += (controller?.progressTotal ?? 0) - (controller?.progress ?? 0);
    }

    this.estimatedEnergyRemaining = Math.min(energyRemaining, workTicksRemaining * energy);
  }, 100);

  calculateHaulingCapacity() {
    if (this.creeps.engineers.resolved.length === 0) {
      this.missionData.targetHaulingCapacity = 0;
      return;
    }
    const path = this.cachedPath();
    if (!path) return;
    const distance = path.length * 2;
    // max - will be less for repairing/upgrading
    const energyPerTick = this.creeps.engineers.resolved.map(engineer => combatPower(engineer).build).reduce(sum, 0);
    this.missionData.targetHaulingCapacity = distance * energyPerTick;
  }

  cachedPath = memoizeOncePerTick(() => {
    const from = roomPlans(this.missionData.office)?.headquarters?.storage.pos;
    const to = roomPlans(this.missionData.targetOffice)?.headquarters?.storage.pos;
    if (!from || !to) return;
    return cachePath(this.id, from, { pos: to, range: 1 }, { reusePath: 1500 });
  });

  run(
    creeps: ResolvedCreeps<AcquireEngineerMission>,
    missions: ResolvedMissions<AcquireEngineerMission>,
    data: AcquireEngineerMissionData
  ) {
    const { engineers, haulers } = creeps;

    this.calculateHaulingCapacity();
    this.updateEstimatedEnergy();

    // recycle if not needed
    if (!officeShouldSupportAcquireTarget(data.office)) {
      if (engineers.length === 0 && haulers.length === 0) {
        this.status = MissionStatus.DONE;
        return;
      }
      engineers.forEach(engineer => recycle({ office: data.targetOffice }, engineer));
      haulers.forEach(h => recycle({ office: data.targetOffice }, h));
    }

    // cache inter-room route
    const path = this.cachedPath();
    if (!path) console.log('Engineer cached path failed');

    this.logCpu('overhead');

    // run engineers
    engineers.forEach(engineer => this.runEngineer(engineer));

    const engineerToFill = engineers
      .filter(u => isSpawned(u) && estimatedFreeCapacity(u) >= u.store.getCapacity(RESOURCE_ENERGY) / 2)
      .reduce((best, current) => {
        if (estimatedFreeCapacity(current) > estimatedFreeCapacity(best)) return current;
        return best;
      }, engineers[0]);

    // target engineer with the most free capacity
    const containers = roomPlans(data.targetOffice)?.fastfiller?.containers.map(c => c.structure);
    const library = roomPlans(data.targetOffice)?.library?.container.structure;
    for (const hauler of haulers.filter(isSpawned)) {
      // Load up with energy from sponsor office
      runStates(
        {
          [States.DEPOSIT]: (data, creep) => {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.WITHDRAW;
            const containerTarget = containers?.find(c => estimatedFreeCapacity(c) > 0) ?? library;
            if (engineerToFill && this.missionData.initialized) {
              moveTo(creep, engineerToFill, { plainCost: 2, swampCost: 10 });
              creep.transfer(engineerToFill, RESOURCE_ENERGY);
            } else if (containerTarget && estimatedFreeCapacity(containerTarget) > 0) {
              moveTo(creep, containerTarget, { plainCost: 2, swampCost: 10 });
              creep.transfer(containerTarget, RESOURCE_ENERGY);
            } else {
              moveTo(
                creep,
                { pos: new RoomPosition(25, 25, data.targetOffice), range: 20 },
                { plainCost: 2, swampCost: 10 }
              );
            }
            return States.DEPOSIT;
          },
          [States.WORKING]: (data, creep) => {
            if (creep.pos.roomName !== data.targetOffice) {
              moveByPath(creep, this.id);
              return States.WORKING;
            }
            return States.DEPOSIT;
          },
          [States.WITHDRAW]: (data, creep) => {
            if (estimatedFreeCapacity(creep) === 0) return States.WORKING;
            if (creep.pos.roomName !== data.office) {
              moveByPath(creep, this.id, { reverse: true });
              return States.WITHDRAW;
            }
            return withdraw(true)({ office: data.office, assignment: {} }, creep);
          },
          [States.RECYCLE]: recycle
        },
        data,
        hauler
      );
    }

    this.logCpu('creeps');
  }

  runEngineer(engineer: Creep) {
    this.missionData.initialized ??= [];
    if (!this.missionData.initialized.includes(engineer.name)) {
      if (engineer.pos.roomName === this.missionData.targetOffice) {
        this.missionData.initialized.push(engineer.name);
      } else {
        moveByPath(engineer, this.id);
        return;
      }
    }

    this.queue.survey();

    runStates(
      {
        [States.FIND_WORK]: (mission, creep) => {
          if (rcl(this.missionData.targetOffice) < 2) return States.UPGRADING; // get to RCL2 first, enables safe mode
          delete mission.facilitiesTarget;
          const nextStructure = this.queue.getNextStructure(creep);
          if (nextStructure) {
            mission.facilitiesTarget = nextStructure.serialize();
            return States.BUILDING;
          }
          delete mission.facilitiesTarget;
          if (rcl(this.missionData.targetOffice) < ACQUIRE_MAX_RCL) return States.UPGRADING; // After max RCL,
          return States.RECYCLE;
        },
        [States.BUILDING]: (mission, creep) => {
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
                  // Check if we need to destroy something
                  for (const existing of Game.rooms[plan.pos.roomName]
                    ?.find(FIND_STRUCTURES)
                    .filter(s => s.structureType === plan.structureType) ?? []) {
                    if (
                      plannedStructuresByRcl(plan.pos.roomName, rcl(this.missionData.targetOffice)).every(
                        s => !s.pos.isEqualTo(existing.pos)
                      )
                    ) {
                      existing.destroy(); // not a planned structure
                      break;
                    }
                  }
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
                  return States.BUILDING; // Wait for hauler
                }
              }
            }
            plan.survey();
          }

          return States.BUILDING;
        },
        [States.UPGRADING]: (mission, creep) => {
          if (
            rcl(this.missionData.targetOffice) >= 4 &&
            storageEnergyAvailable(this.missionData.targetOffice) <=
              getWithdrawLimit(this.missionData.targetOffice, this.budget)
          )
            return States.FIND_WORK;

          // No construction - upgrade instead
          const controller = Game.rooms[this.missionData.targetOffice]?.controller;
          if (!controller) return States.FIND_WORK;
          moveTo(creep, { pos: controller.pos, range: 3 });
          const result = creep.upgradeController(controller);
          if (result == ERR_NOT_ENOUGH_ENERGY) {
            return States.UPGRADING; // Wait for hauler
          } else if (result === OK) {
            this.recordEnergy(
              UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length
            );
          }
          if (Game.time % 10 === 0) return States.FIND_WORK;
          return States.UPGRADING;
        },
        [States.RECYCLE]: (mission, creep) => {
          recycle(this.missionData, creep);
          return States.FIND_WORK;
        }
      },
      this.missionData,
      engineer
    );
  }
}
