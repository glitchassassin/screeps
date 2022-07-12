import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { getRangeByPath, getRangeTo, lookNear } from "Selectors/MapCoordinates";
import { minionCost } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { storageStructureThatNeedsEnergy } from "Selectors/storageStructureThatNeedsEnergy";
import { MissionImplementation } from "./MissionImplementation";

export interface AcquireLogisticsMission extends Mission<MissionType.ACQUIRE_LOGISTICS> {
  data: {
    targetOffice: string,
    initialized: boolean,
  }
}

export function createAcquireLogisticsMission(office: string, targetOffice: string): AcquireLogisticsMission {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
  const capacity = body.filter(b => b === CARRY).length * CARRY_CAPACITY;
  const from = roomPlans(office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office);
  const to = roomPlans(targetOffice)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office);
  const distance = getRangeByPath(from, to, 1) ?? (getRangeTo(from, to) * 10);
  const lifetimeCapacity = Math.ceil(CREEP_LIFE_TIME / (distance * 2)) * capacity;

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.6,
    energy: minionCost(body) + lifetimeCapacity,
  }
  return createMission({
    office,
    priority: 5.1,
    type: MissionType.ACQUIRE_LOGISTICS,
    data: {
      targetOffice,
      initialized: false
    },
    estimate,
  })
}

export class AcquireLogistics extends MissionImplementation {
  static spawn(mission: AcquireLogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `ACCOUNTANT-${mission.office}-${mission.id}`
    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office));

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

  static minionLogic(mission: AcquireLogisticsMission, creep: Creep) {
    creep.memory.state ??= States.WITHDRAW;
    if (creep.memory.state === States.WITHDRAW) {
      // Load up with energy from sponsor office
      if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
        setState(States.DEPOSIT)(creep);
      }
    }
    if (creep.memory.state === States.DEPOSIT) {
      const target = storageStructureThatNeedsEnergy(mission.data.targetOffice);

      if (creep.pos.roomName === mission.data.targetOffice && (!target || creep.pos.getRangeTo(target) > 1)) {
        // Check for nearby targets of opportunity
        const opportunityTargets = lookNear(creep.pos);
        let energyRemaining = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        for (const opp of opportunityTargets) {
          if (opp.creep?.my) {
            if (
              (opp.creep.name.startsWith('ENGINEER') || opp.creep.name.startsWith('PARALEGAL')) &&
              opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
              storageEnergyAvailable(mission.office) >= Game.rooms[mission.office].energyCapacityAvailable
            ) {
              creep.transfer(opp.creep, RESOURCE_ENERGY);
              energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
              if (opp.creep.memory.state === States.GET_ENERGY) {
                setState(States.WORKING)(opp.creep)
              }
            }
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
