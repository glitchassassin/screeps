import { BehaviorResult } from 'Behaviors/Behavior';
import { getBoosted } from 'Behaviors/getBoosted';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { bestTierAvailable } from 'Minions/bestBuildTier';
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
import { moveTo } from 'screeps-cartographer';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { roomPlans } from 'Selectors/roomPlans';
import { CreepsThatNeedEnergy } from 'Selectors/storageStructureThatNeedsEnergy';

export interface UpgradeMissionData extends BaseMissionData {}

export class UpgradeMission extends MissionImplementation {
  public creeps = {
    upgraders: new MultiCreepSpawner('h', this.missionData.office, {
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

        // cap at link throughput
        const from = roomPlans(this.missionData.office)?.headquarters?.link.pos
        const to = roomPlans(this.missionData.office)?.library?.link.pos
        if (from && to) {
          const cooldown = from.getRangeTo(to)
          const energyPerTick = LINK_CAPACITY / cooldown
          const upgraderEnergyCapacity = UPGRADE_CONTROLLER_COST * current.map(c => c.getActiveBodyparts(WORK)).reduce(sum, 0)
          if (upgraderEnergyCapacity > energyPerTick) return 0;
        }
        return 1; // spawn as many as we can use
      },
      estimatedCpuPerTick: 0.8,
    })
  };

  priority = 5;

  constructor(public missionData: UpgradeMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: UpgradeMission['id']) {
    return super.fromId(id) as UpgradeMission;
  }

  capacity() {
    return this.creeps.upgraders.resolved.map(c => c.store.getCapacity()).reduce(sum, 0);
  }
  needsSupplementalEnergy() {
    return this.capacity() > LINK_CAPACITY / 2;
  }

  run(creeps: ResolvedCreeps<UpgradeMission>, missions: ResolvedMissions<UpgradeMission>, data: UpgradeMissionData) {
    const { upgraders } = creeps;

    this.estimatedEnergyRemaining = upgraders
      .map(
        creep =>
          creep.body.filter(p => p.type === WORK).length *
          Math.min(estimateMissionInterval(data.office), creep.ticksToLive ?? CREEP_LIFE_TIME)
      )
      .reduce(sum, 0);

    for (const creep of upgraders) {
      if (this.needsSupplementalEnergy()) {
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

    this.logCpu("creeps");
  }
}
