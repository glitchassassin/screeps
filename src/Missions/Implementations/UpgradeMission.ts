import { BehaviorResult } from 'Behaviors/Behavior';
import { getBoosted } from 'Behaviors/getBoosted';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { bestTierAvailable } from 'Minions/bestBuildTier';
import { buildAccountant } from 'Minions/Builds/accountant';
import { buildResearch } from 'Minions/Builds/research';
import { MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { estimateMissionInterval } from 'Missions/Selectors';
import { generatePath, moveTo } from 'screeps-cartographer';
import { combatPower } from 'Selectors/Combat/combatStats';
import { isSpawned } from 'Selectors/isSpawned';
import { estimatedFreeCapacity } from 'Selectors/Logistics/predictiveCapacity';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { roomPlans } from 'Selectors/roomPlans';

export interface UpgradeMissionData extends BaseMissionData {
  targetHaulingCapacity?: number;
  actualHaulingCapacity?: number;
  distance?: number;
}

export class UpgradeMission extends MissionImplementation {
  public creeps = {
    upgraders: new MultiCreepSpawner('u', this.missionData.office, {
      role: MinionTypes.RESEARCH,
      budget: Budget.SURPLUS,
      builds: energy => bestTierAvailable(this.missionData.office, buildResearch(energy)),
      count: current => {
        if (rcl(this.missionData.office) === 8 && current.length) {
          return 0; // maintain one upgrader at RCL8
        }
        // if (new EngineerQueue(this.missionData.office).analysis().energyRemaining > 1500) return 0; // don't upgrade while construction to do
        if (
          rcl(this.missionData.office) < 2 &&
          (Game.rooms[this.missionData.office].controller?.ticksToDowngrade ?? Infinity) > 3000
        )
          return 0; // engineers will upgrade

        // wait for haulers if needed
        if (
          this.missionData.targetHaulingCapacity !== undefined &&
          this.missionData.actualHaulingCapacity !== undefined &&
          this.missionData.targetHaulingCapacity > this.missionData.actualHaulingCapacity
        ) {
          return 0;
        }

        return 1; // spawn as many as we can use
      },
      estimatedCpuPerTick: 0.8
    }),
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      builds: energy => buildAccountant(energy, 25, true, false),
      count: current => {
        if (this.missionData.targetHaulingCapacity === undefined) return 0;
        if (current.map(c => combatPower(c).carry).reduce(sum, 0) >= this.missionData.targetHaulingCapacity) return 0;
        return 1;
      },
      estimatedCpuPerTick: 1
    })
  };

  priority = 5;

  constructor(
    public missionData: UpgradeMissionData,
    id?: string
  ) {
    super(missionData, id);
  }
  static fromId(id: UpgradeMission['id']) {
    return super.fromId(id) as UpgradeMission;
  }

  capacity() {
    return this.creeps.upgraders.resolved.map(c => c.store.getCapacity()).reduce(sum, 0);
  }

  run(creeps: ResolvedCreeps<UpgradeMission>, missions: ResolvedMissions<UpgradeMission>, data: UpgradeMissionData) {
    const { upgraders, haulers } = creeps;

    this.estimatedEnergyRemaining = upgraders
      .map(
        creep =>
          creep.body.filter(p => p.type === WORK).length *
          Math.min(estimateMissionInterval(data.office), creep.ticksToLive ?? CREEP_LIFE_TIME)
      )
      .reduce(sum, 0);

    // set distance
    const storage = roomPlans(this.missionData.office)?.headquarters?.storage;
    if (this.missionData.distance === undefined) {
      const storagePos = storage?.pos;
      const controllerPos = Game.rooms[this.missionData.office].controller?.pos;
      if (storagePos && controllerPos) {
        this.missionData.distance = generatePath(storagePos, [{ pos: controllerPos, range: 3 }])?.length;
      }
    }

    // set hauling capacity if we have links and a storage
    const from = roomPlans(this.missionData.office)?.headquarters?.link;
    const to = roomPlans(this.missionData.office)?.library?.link;
    if (from && to && storage?.structure && this.missionData.distance !== undefined) {
      const cooldown = from.pos.getRangeTo(to.pos);
      const energyPerTick = LINK_CAPACITY / cooldown;
      const upgraderEnergyCapacity =
        UPGRADE_CONTROLLER_COST * upgraders.map(c => c.getActiveBodyparts(WORK)).reduce(sum, 0);
      this.missionData.targetHaulingCapacity = Math.max(
        0,
        (upgraderEnergyCapacity - energyPerTick) * this.missionData.distance
      );
    } else {
      this.missionData.targetHaulingCapacity = 0;
    }
    this.missionData.actualHaulingCapacity = haulers.map(c => combatPower(c).carry).reduce(sum, 0);

    for (const creep of upgraders) {
      runStates(
        {
          [States.GET_BOOSTED]: getBoosted(States.WORKING),
          [States.WORKING]: (mission, creep) => {
            let energyUsed =
              UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length;
            const controller = Game.rooms[mission.office]?.controller;
            if (!controller) throw new Error(`No controller for upgrader ${creep.name} (${creep.pos})`);

            if (
              creep.store.getUsedCapacity(RESOURCE_ENERGY) >
              creep.store.getCapacity(RESOURCE_ENERGY) / 2 + energyUsed
            ) {
              // Try to share energy with other creeps
              const nearby = upgraders.find(
                u =>
                  u !== creep &&
                  u.pos.isNearTo(creep) &&
                  u.store.getUsedCapacity(RESOURCE_ENERGY) < u.store.getCapacity(RESOURCE_ENERGY) / 2 &&
                  u.pos.getRangeTo(controller.pos) < creep.pos.getRangeTo(controller.pos)
              );
              if (nearby)
                creep.transfer(
                  nearby,
                  RESOURCE_ENERGY,
                  Math.min(nearby.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getCapacity(RESOURCE_ENERGY) / 2)
                );

              // Move out of the way of other upgraders if needed
              const range = 3;
              moveTo(creep, { pos: controller.pos, range });
            } else {
              // try to get more energy
              const container = roomPlans(mission.office)?.library?.container.structure as StructureContainer;
              const link = roomPlans(mission.office)?.library?.link.structure as StructureLink;

              if (link && link.store[RESOURCE_ENERGY]) {
                moveTo(creep, { pos: link.pos, range: 1 });
                if (creep.withdraw(link, RESOURCE_ENERGY) === OK) {
                  link.store[RESOURCE_ENERGY] = Math.max(
                    0,
                    link.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity()
                  );
                }
              } else if (container) {
                if (container.store[RESOURCE_ENERGY]) {
                  moveTo(creep, { pos: container.pos, range: 1 });
                  if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
                    container.store[RESOURCE_ENERGY] = Math.max(
                      0,
                      container.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity()
                    );
                  }
                } else {
                  moveTo(creep, { pos: container.pos, range: 3 }); // wait for energy
                }
              } else if (!link && !container) {
                if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
                  return States.WORKING;
                }
              }
            }

            // do upgrades
            const result = creep.upgradeController(controller);
            if (result === OK) {
              if (rcl(mission.office) === 8) energyUsed = Math.min(15, energyUsed);
              this.recordEnergy(energyUsed);
            }
            return States.WORKING;
          }
        },
        this.missionData,
        creep
      );
    }

    const upgraderToFill = upgraders
      .filter(u => isSpawned(u) && estimatedFreeCapacity(u) >= u.store.getCapacity(RESOURCE_ENERGY) / 2)
      .reduce((best, current) => {
        if (estimatedFreeCapacity(current) > estimatedFreeCapacity(best)) return current;
        return best;
      }, upgraders[0]);

    for (const hauler of haulers) {
      runStates(
        {
          [States.DEPOSIT]: (data, creep) => {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.WITHDRAW;

            if (upgraderToFill && isSpawned(upgraderToFill)) {
              moveTo(creep, upgraderToFill);
              creep.transfer(upgraderToFill, RESOURCE_ENERGY);
            } else if (to?.structure && estimatedFreeCapacity(to.structure) > 0) {
              moveTo(creep, to.structure);
              creep.transfer(to.structure, RESOURCE_ENERGY);
            } else {
              moveTo(creep, { pos: Game.rooms[data.office].controller!.pos, range: 10 });
            }
            return States.DEPOSIT;
          },
          [States.WITHDRAW]: (data, creep) => {
            if (estimatedFreeCapacity(creep) === 0) return States.DEPOSIT;
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
}
