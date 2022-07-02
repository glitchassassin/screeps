import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromFranchise } from "Behaviors/getEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { byId } from "Selectors/byId";
import { roadConstructionToDo } from "Selectors/facilitiesWorkToDo";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { getFranchiseDistance } from "Selectors/getFranchiseDistance";
import { lookNear } from "Selectors/MapCoordinates";
import { minionCost } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { storageStructureThatNeedsEnergy } from "Selectors/storageStructureThatNeedsEnergy";
import { MissionImplementation } from "./MissionImplementation";

export interface LogisticsMission extends Mission<MissionType.LOGISTICS> {
  data: {
    capacity: number,
    logisticsTarget?: Id<Tombstone|Source>
  }
}

const assignedLogisticsCapacity = (office: string) => {
  const assignments = new Map<Id<Tombstone|Source>, number>();

  for (const mission of Memory.offices[office].activeMissions) {
    if (mission.type !== MissionType.LOGISTICS || !mission.data.logisticsTarget) continue;
    assignments.set(
      mission.data.logisticsTarget,
      (assignments.get(mission.data.logisticsTarget) ?? 0) + mission.data.capacity
    );
  }

  return assignments
}

export function createLogisticsMission(office: string, priority = 11): LogisticsMission {
  const roads = rcl(office) > 3 && roadConstructionToDo(office).length < 10;
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority,
    type: MissionType.LOGISTICS,
    data: {
      capacity
    },
    estimate,
  })
}

export class Logistics extends MissionImplementation {
  static spawn(mission: LogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const roads = rcl(mission.office) > 3 && roadConstructionToDo(mission.office).length < 10

    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office), 50, roads);

    // Set name
    const name = `ACCOUNTANT-${mission.office}-${Game.time % 10000}-${Math.floor(Math.random()*100)}`

    mission.data.capacity ??= body.filter(p => p === CARRY).length * CARRY_CAPACITY;

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body,
      }
    )

    mission.creepNames.push(name);
  }

  static minionLogic(mission: LogisticsMission, creep: Creep): void {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      setState(States.WITHDRAW)(creep);
    } else if (!creep.memory.state) {
      setState(States.DEPOSIT)(creep);
    }
    // logCpu('initialize state')
    if (creep.memory.state === States.WITHDRAW) {
      // Select target
      const pos = posById(mission.data.logisticsTarget) ?? byId(mission.data.logisticsTarget)?.pos
      if (!mission.data.logisticsTarget || !pos) {
        const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 5, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }).shift()
        // logCpu('check tombstones')
        if (tombstone) {
          // Get energy from nearby tombstone
          mission.data.logisticsTarget = tombstone.id;
        } else {
          // Get energy from a franchise
          const assigned = assignedLogisticsCapacity(mission.office);
          let bestTarget = undefined;
          let bestAmount = 0;
          let bestDistance = Infinity;
          for (let { source, room } of franchisesByOffice(mission.office)) {
            const capacity = assigned.get(source) ?? 0;
            const amount = franchiseEnergyAvailable(source) - capacity;
            const distance = getFranchiseDistance(mission.office, source) ?? Infinity;
            if (
              (distance < bestDistance && amount >= Math.min(bestAmount, creep.store.getFreeCapacity(RESOURCE_ENERGY))) ||
              (amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))
            ) {
              bestTarget = source;
              bestAmount = amount;
              bestDistance = distance;
            }
          }
          if (bestTarget) {
            mission.data.logisticsTarget = bestTarget;
          }
          // logCpu('check franchises')
        }
      }

      // Withdraw from target
      if (mission.data.logisticsTarget) {
        const target = byId(mission.data.logisticsTarget);
        if (target instanceof Tombstone && moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.withdraw(target, RESOURCE_ENERGY);
          delete mission.data.logisticsTarget;
          delete creep.memory.state;
        } else if (posById(mission.data.logisticsTarget)) {
          const result = getEnergyFromFranchise(creep, mission.data.logisticsTarget as Id<Source>);
          if (result === BehaviorResult.SUCCESS || franchiseEnergyAvailable(mission.data.logisticsTarget as Id<Source>) <= 50) {
            delete mission.data.logisticsTarget;
            delete creep.memory.state;
          }
        }
        // logCpu('withdraw')
      } else {
        creep.say('Idle');
      }
    }
    if (creep.memory.state === States.DEPOSIT) {
      const target = storageStructureThatNeedsEnergy(mission.office);

      if (!target || creep.pos.getRangeTo(target) > 1) {
        // Check for nearby targets of opportunity
        const opportunityTargets = lookNear(creep.pos);
        let energyRemaining = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        for (const opp of opportunityTargets) {
          if (opp.creep?.my) {
            if (
              opp.creep.name.startsWith('ENGINEER') &&
              opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
              storageEnergyAvailable(mission.office) >= Game.rooms[mission.office].energyCapacityAvailable
            ) {
              creep.transfer(opp.creep, RESOURCE_ENERGY);
              energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
              if (opp.creep.memory.state === States.GET_ENERGY) {
                setState(States.WORKING)(opp.creep)
              }
            } //else if (
            //     opp.creep.memory.objective === 'LogisticsObjective' &&
            //     opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            //     opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) <= energyRemaining &&
            //     target &&
            //     opp.creep.pos.getRangeTo(target) < creep.pos.getRangeTo(target)
            // ) {
            //     creep.transfer(opp.creep, RESOURCE_ENERGY);
            //     energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
            //     if (opp.creep.memory.state === States.WITHDRAW) {
            //         moveTo(target.pos, 1)(opp.creep)
            //         setState(States.DEPOSIT)(opp.creep)
            //     }
            // }
          }
        }
        if (energyRemaining === 0) {
          setState(States.WITHDRAW)(creep);
          return;
        }
      }
      if (!target) return;
      if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        creep.transfer(target, RESOURCE_ENERGY);
        // Back away
        creep.move(target.pos.getDirectionTo(creep.pos.x, creep.pos.y))
      }
      // logCpu('deposit')
    }
  }
}