import { BehaviorResult } from 'Behaviors/Behavior';
import { getEnergyFromFranchise } from 'Behaviors/getEnergyFromFranchise';
import { moveTo } from 'Behaviors/moveTo';
import { runStates } from 'Behaviors/stateMachine';
import { setState, States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/franchisesByOffice';
import { getFranchiseDistance } from 'Selectors/getFranchiseDistance';
import { lookNear } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
import { franchisesThatNeedRoadWork } from 'Selectors/plannedTerritoryRoads';
import { posById } from 'Selectors/posById';
import { rcl } from 'Selectors/rcl';
import { renewCost } from 'Selectors/renewCost';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { storageStructureThatNeedsEnergy } from 'Selectors/storageStructureThatNeedsEnergy';
import { memoizeByTick } from 'utils/memoizeFunction';
import { MissionImplementation } from './MissionImplementation';

export interface LogisticsMission extends Mission<MissionType.LOGISTICS> {
  data: {
    capacity: number;
    logisticsTarget?: Id<Tombstone | Source>;
  };
}

const assignedLogisticsCapacity = memoizeByTick(
  office => office,
  (office: string) => {
    const assignments = new Map<Id<Source>, number>();

    for (let { source } of franchisesByOffice(office)) {
      assignments.set(source, 0);
    }

    for (const mission of activeMissions(office).filter(isMission(MissionType.LOGISTICS))) {
      if (!mission.data.logisticsTarget || !assignments.has(mission.data.logisticsTarget as Id<Source>)) continue;
      assignments.set(
        mission.data.logisticsTarget as Id<Source>,
        (assignments.get(mission.data.logisticsTarget as Id<Source>) ?? 0) + mission.data.capacity
      );
    }

    return assignments;
  }
);

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

    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office), 50, roads);

    // Set name
    const name = `ACCOUNTANT-${mission.office}-${mission.id}`;

    mission.data.capacity ??= body.filter(p => p === CARRY).length * CARRY_CAPACITY;

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
          if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.FIND_WORK;
          mission.efficiency.working += 1;

          const target = storageStructureThatNeedsEnergy(mission.office);

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
                } else if (
                  opp.creep.name.startsWith('ACCOUNTANT') &&
                  opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) >= energyRemaining &&
                  target &&
                  opp.creep.pos.getRangeTo(target) < creep.pos.getRangeTo(target)
                ) {
                  creep.transfer(opp.creep, RESOURCE_ENERGY);
                  energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
                  setState(States.DEPOSIT)(opp.creep);
                  break;
                }
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
              return States.WITHDRAW;
            }
          }
          if (!target) return States.DEPOSIT;
          if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
            creep.transfer(target, RESOURCE_ENERGY);
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
        [States.FIND_WORK]: (mission, creep) => {
          // Get energy from a franchise
          const franchiseCapacity = assignedLogisticsCapacity(mission.office);
          let bestTarget = undefined;
          let bestAmount = 0;
          let bestDistance = Infinity;
          for (const [source, capacity] of franchiseCapacity) {
            const amount = franchiseEnergyAvailable(source) - capacity;
            const distance = getFranchiseDistance(mission.office, source) ?? Infinity;
            if (
              (distance < bestDistance &&
                amount >= Math.min(bestAmount, creep.store.getFreeCapacity(RESOURCE_ENERGY))) ||
              (amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))
            ) {
              bestTarget = source;
              bestAmount = amount;
              bestDistance = distance;
            }
          }
          if (bestTarget) {
            franchiseCapacity.set(bestTarget, (franchiseCapacity.get(bestTarget) ?? 0) + mission.data.capacity);
            mission.data.logisticsTarget = bestTarget;
          }
          if (mission.data.logisticsTarget) return States.WITHDRAW;
          creep.say('Idle');
          return States.FIND_WORK;
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

          if (energyCapacity === 0) return States.DEPOSIT;

          // Otherwise, continue to main withdraw target
          const pos = posById(mission.data.logisticsTarget) ?? byId(mission.data.logisticsTarget)?.pos;
          if (!mission.data.logisticsTarget || !pos) {
            return States.FIND_WORK;
          }

          // Target identified
          const result = getEnergyFromFranchise(creep, mission.data.logisticsTarget as Id<Source>);
          if (result === BehaviorResult.SUCCESS) {
            return States.DEPOSIT;
          } else if (franchiseEnergyAvailable(mission.data.logisticsTarget as Id<Source>) <= 50) {
            return States.FIND_WORK;
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
