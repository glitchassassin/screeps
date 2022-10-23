import { BehaviorResult } from 'Behaviors/Behavior';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
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
import { memoizeByTick } from 'utils/memoizeFunction';

export interface UpgradeMissionData extends BaseMissionData {}

export class UpgradeMission extends MissionImplementation {
  public creeps = {
    upgraders: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.RESEARCH,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.RESEARCH](energy, this.calculated().maxWork),
      count: current => {
        if (rcl(this.missionData.office) === 8 && current.length) {
          return 0; // maintain one upgrader at RCL8
        }
        return 1; // spawn as many as we can use
      }
    })
  };

  priority = 10;

  constructor(public missionData: UpgradeMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: UpgradeMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  calculated = memoizeByTick(
    () => '',
    () => {
      return {
        maxWork:
          rcl(this.missionData.office) === 8
            ? 15
            : Math.max(
                1,
                Math.floor((Game.rooms[this.missionData.office].energyCapacityAvailable * 5) / CREEP_LIFE_TIME)
              )
      };
    }
  );

  run(creeps: ResolvedCreeps<UpgradeMission>, missions: ResolvedMissions<UpgradeMission>, data: UpgradeMissionData) {
    const { upgraders } = creeps;

    this.estimatedEnergyRemaining = upgraders
      .map(
        creep =>
          creep.body.filter(p => p.type === WORK).length *
          Math.min(estimateMissionInterval(this.missionData.office), creep.ticksToLive ?? 0)
      )
      .reduce(sum, 0);

    for (const creep of upgraders) {
      runStates(
        {
          [States.GET_ENERGY]: (mission, creep) => {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) return States.WORKING;
            const container = roomPlans(mission.office)?.library?.container.structure as StructureContainer;
            const link = roomPlans(mission.office)?.library?.link.structure as StructureLink;
            if (link && link.store[RESOURCE_ENERGY]) {
              moveTo(creep, { pos: link.pos, range: 1 });
              if (creep.withdraw(link, RESOURCE_ENERGY) === OK) {
                link.store[RESOURCE_ENERGY] = Math.max(0, link.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity());
                return States.WORKING;
              }
            } else if (container && container.store[RESOURCE_ENERGY]) {
              moveTo(creep, { pos: container.pos, range: 1 });
              if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
                container.store[RESOURCE_ENERGY] = Math.max(
                  0,
                  container.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity()
                );
                return States.WORKING;
              }
            } else if (!link && !container) {
              if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
                return States.WORKING;
              }
            }
            return States.GET_ENERGY;
          },
          [States.WORKING]: (mission, creep) => {
            const controller = Game.rooms[mission.office]?.controller;
            if (!controller) throw new Error(`No controller for upgrader ${creep.name} (${creep.pos})`);
            // Move out of the way of other upgraders if needed
            const range = 3;
            // Memory.offices[mission.office].activeMissions.filter(m => m.type === MissionType.UPGRADE).length > 3 ? 1 : 3;
            moveTo(creep, { pos: controller.pos, range });
            const result = creep.upgradeController(controller);
            if (result === OK) {
              let energyUsed =
                UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length;
              if (rcl(mission.office) === 8) energyUsed = Math.min(15, energyUsed);
              this.recordEnergy(energyUsed);
              if (creep.store[RESOURCE_ENERGY] <= energyUsed) return States.GET_ENERGY;
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
              return States.GET_ENERGY;
            }

            return States.WORKING;
          }
        },
        this.missionData,
        creep
      );
    }
  }
}
