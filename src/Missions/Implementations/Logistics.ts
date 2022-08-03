import { BehaviorResult } from 'Behaviors/Behavior';
import { getEnergyFromFranchise } from 'Behaviors/getEnergyFromFranchise';
import { assignedLogisticsCapacity, findBestDepositTarget, findBestWithdrawTarget } from 'Behaviors/logistics';
import { moveTo } from 'Behaviors/moveTo';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { byId } from 'Selectors/byId';
import { plannedStructureNeedsWork } from 'Selectors/facilitiesWorkToDo';
import { franchiseEnergyAvailable } from 'Selectors/franchiseEnergyAvailable';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
import { franchisesThatNeedRoadWork, plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { posById } from 'Selectors/posById';
import { rcl } from 'Selectors/rcl';
import { renewCost } from 'Selectors/renewCost';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { viz } from 'Selectors/viz';
import { MissionImplementation } from './MissionImplementation';

export interface LogisticsMission extends Mission<MissionType.LOGISTICS> {
  data: {
    capacity: number;
    withdrawTarget?: Id<Tombstone | Source>;
    depositTarget?: Id<AnyStoreStructure | Creep>;
    repair?: boolean;
  };
}

export function createLogisticsMission(office: string, priority = 11): LogisticsMission {
  const roads = rcl(office) > 3 && franchisesThatNeedRoadWork(office).length <= 2;
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.8,
    energy: minionCost(body)
  };

  return createMission({
    office,
    priority,
    type: MissionType.LOGISTICS,
    data: {
      capacity
    },
    estimate
  });
}

export class Logistics extends MissionImplementation {
  static spawn(mission: LogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const roads = rcl(mission.office) > 3 && franchisesThatNeedRoadWork(mission.office).length <= 2;

    const repair =
      rcl(mission.office) > 3 &&
      plannedTerritoryRoads(mission.office).some(r => r.structure && plannedStructureNeedsWork(r));

    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office), 50, roads, repair);

    // Set name
    const name = `ACCOUNTANT-${mission.office}-${mission.id}`;

    mission.data.capacity ??= body.filter(p => p === CARRY).length * CARRY_CAPACITY;
    mission.data.repair = repair;

    scheduleSpawn(mission.office, mission.priority, {
      name,
      body
    });

    mission.creepNames.push(name);
  }

  static minionLogic(mission: LogisticsMission, creep: Creep): void {
    const nearby = lookNear(creep.pos);

    runStates(
      {
        [States.DEPOSIT]: (mission, creep) => {
          if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.FIND_WITHDRAW;
          mission.efficiency.working += 1;

          let target = byId(mission.data.depositTarget);

          if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
            return States.FIND_DEPOSIT;
          }

          if (mission.data.repair) {
            const road = creep.pos
              .findInRange(FIND_STRUCTURES, 3)
              .find(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax);
            if (road) creep.repair(road);
          }

          if (!target || creep.pos.getRangeTo(target) > 1) {
            // Check for nearby targets of opportunity
            let energyRemaining = creep.store.getUsedCapacity(RESOURCE_ENERGY);
            for (const opp of nearby) {
              if (opp.creep?.my) {
                if (
                  opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                  (((opp.creep.name.startsWith('ENGINEER') || opp.creep.name.startsWith('RESEARCH')) &&
                    storageEnergyAvailable(mission.office) >= Game.rooms[mission.office].energyCapacityAvailable) ||
                    opp.creep.name.startsWith('REFILL'))
                ) {
                  creep.transfer(opp.creep, RESOURCE_ENERGY);
                  energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
                  break;
                }
                // else if (
                //   opp.creep.name.startsWith('ACCOUNTANT') &&
                //   opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) >= energyRemaining &&
                //   target &&
                //   opp.creep.pos.getRangeTo(target) < creep.pos.getRangeTo(target)
                // ) {
                //   if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
                //     energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
                //     opp.creep.memory.runState = States.DEPOSIT;
                //     return States.WITHDRAW;
                //   }
                //   break;
                // }
              } else if (
                (opp.structure?.structureType === STRUCTURE_EXTENSION ||
                  opp.structure?.structureType === STRUCTURE_SPAWN) &&
                (opp.structure as AnyStoreStructure).store[RESOURCE_ENERGY] <
                  (opp.structure as AnyStoreStructure).store.getCapacity(RESOURCE_ENERGY)
              ) {
                creep.transfer(opp.structure, RESOURCE_ENERGY);
                energyRemaining -= Math.min(
                  (opp.structure as AnyStoreStructure).store[RESOURCE_ENERGY],
                  energyRemaining
                );
                break;
              }
            }
            if (energyRemaining === 0) {
              return States.FIND_WITHDRAW;
            }
          }
          if (!target) return States.DEPOSIT;
          viz(creep.pos.roomName).line(creep.pos, target.pos);
          if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
            if (creep.transfer(target, RESOURCE_ENERGY) === OK) {
              delete mission.data.depositTarget;
            }
            // If target is spawn, is not spawning, and is at capacity, renew this creep
            if (
              target instanceof StructureSpawn &&
              !target.spawning &&
              target.store.getUsedCapacity(RESOURCE_ENERGY) + creep.store.getUsedCapacity(RESOURCE_ENERGY)
            ) {
              if (target.renewCreep(creep) === OK) {
                mission.actual.energy += renewCost(creep);
              }
            }
          }

          return States.DEPOSIT;
        },
        [States.FIND_DEPOSIT]: (mission, creep) => {
          delete mission.data.depositTarget;
          // Get energy from a franchise
          const { depositAssignments } = assignedLogisticsCapacity(mission.office);
          const bestTarget = findBestDepositTarget(mission.office, creep);
          if (bestTarget) {
            depositAssignments.set(
              bestTarget,
              (depositAssignments.get(bestTarget) ?? 0) + creep.store[RESOURCE_ENERGY]
            );
            mission.data.depositTarget = bestTarget[1].id;
          }
          if (mission.data.depositTarget) return States.DEPOSIT;
          if (!creep.store[RESOURCE_ENERGY]) return States.FIND_WITHDRAW;
          creep.say('Idle');
          return States.FIND_DEPOSIT;
        },
        [States.FIND_WITHDRAW]: (mission, creep) => {
          delete mission.data.withdrawTarget;
          // Get energy from a franchise
          const { withdrawAssignments } = assignedLogisticsCapacity(mission.office);
          const bestTarget = findBestWithdrawTarget(mission.office, creep);

          if (bestTarget) {
            withdrawAssignments.set(bestTarget, (withdrawAssignments.get(bestTarget) ?? 0) + mission.data.capacity);
            mission.data.withdrawTarget = bestTarget;
          }
          if (mission.data.withdrawTarget) return States.WITHDRAW;
          if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) return States.FIND_DEPOSIT;
          creep.say('Idle');
          return States.FIND_WITHDRAW;
        },
        [States.WITHDRAW]: (mission, creep) => {
          let energyCapacity = creep.store.getFreeCapacity(RESOURCE_ENERGY);

          // Look for opportunity targets
          if (energyCapacity > 0) {
            // Dropped resources
            const resource = nearby.find(r => r.resource?.resourceType === RESOURCE_ENERGY);
            if (resource?.resource) {
              creep.pickup(resource.resource);
              energyCapacity = Math.max(0, energyCapacity - resource.resource.amount);
            }

            // Tombstones
            const tombstone = nearby.find(r => r.tombstone?.store[RESOURCE_ENERGY]);
            if (tombstone?.tombstone) {
              creep.withdraw(tombstone.tombstone, RESOURCE_ENERGY);
              tombstone.tombstone.store[RESOURCE_ENERGY] = Math.max(
                0,
                tombstone.tombstone?.store[RESOURCE_ENERGY] - energyCapacity
              );
              energyCapacity = Math.max(0, energyCapacity - tombstone.tombstone?.store[RESOURCE_ENERGY]);
            }
          }

          if (energyCapacity === 0) return States.FIND_DEPOSIT;

          // Otherwise, continue to main withdraw target
          const pos = posById(mission.data.withdrawTarget) ?? byId(mission.data.withdrawTarget)?.pos;
          if (!mission.data.withdrawTarget || !pos) {
            return States.FIND_WITHDRAW;
          }

          // Target identified
          const result = getEnergyFromFranchise(creep, mission.data.withdrawTarget as Id<Source>);
          if (result === BehaviorResult.SUCCESS) {
            return States.FIND_DEPOSIT;
          } else if (franchiseEnergyAvailable(mission.data.withdrawTarget as Id<Source>) <= 50) {
            return States.FIND_WITHDRAW;
          }

          return States.WITHDRAW;
        }
      },
      mission,
      creep
    );
  }
}

function selectLogisticsTarget(creep: Creep, mission: LogisticsMission) {}
