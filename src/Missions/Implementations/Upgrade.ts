import { BehaviorResult } from 'Behaviors/Behavior';
import { getEnergyFromStorage } from 'Behaviors/getEnergyFromStorage';
import { moveTo } from 'Behaviors/moveTo';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { UPGRADE_CONTROLLER_COST } from 'gameConstants';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { estimateMissionInterval } from 'Missions/Selectors';
import { minionCost } from 'Selectors/minionCostPerTick';
import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface UpgradeMission extends Mission<MissionType.UPGRADE> {
  data: {
    emergency?: boolean;
  };
}

export function createUpgradeMission(office: string, emergency = false): UpgradeMission {
  const maxWork =
    rcl(office) === 8
      ? 15
      : Math.max(1, Math.floor((Game.rooms[office].energyCapacityAvailable * 5) / CREEP_LIFE_TIME));
  const body = MinionBuilders[MinionTypes.RESEARCH](spawnEnergyAvailable(office), maxWork);
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body) + body.filter(p => p === WORK).length * estimateMissionInterval(office)
  };

  return createMission({
    office,
    priority: emergency ? 15 : 7,
    type: MissionType.UPGRADE,
    data: {
      emergency
    },
    estimate
  });
}

export class Upgrade extends MissionImplementation {
  static spawn(mission: UpgradeMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `RESEARCH-${mission.office}-${mission.id}`;
    const body = MinionBuilders[MinionTypes.RESEARCH](spawnEnergyAvailable(mission.office));

    scheduleSpawn(mission.office, mission.priority, {
      name,
      body,
      boosts: [RESOURCE_GHODIUM_ACID]
    });

    mission.creepNames.push(name);
  }

  static minionLogic(mission: Mission<MissionType>, creep: Creep): void {
    // Adjust estimate if needed
    mission.estimate.energy =
      mission.actual.energy +
      creep.body.filter(p => p.type === WORK).length *
        Math.min(estimateMissionInterval(mission.office), creep.ticksToLive ?? 0);

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
            }
          } else if (container) {
            moveTo(creep, { pos: container.pos, range: 1 });
            if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
              container.store[RESOURCE_ENERGY] = Math.max(
                0,
                container.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity()
              );
            }
          } else {
            if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
              return States.WORKING;
            }
          }
          return States.GET_ENERGY;
        },
        [States.WORKING]: (mission, creep) => {
          if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.GET_ENERGY;
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
            mission.actual.energy += energyUsed;
            mission.efficiency.working += 1;
            if (creep.store[RESOURCE_ENERGY] <= energyUsed) return States.GET_ENERGY;
          }

          return States.WORKING;
        }
      },
      mission,
      creep
    );
  }
}
