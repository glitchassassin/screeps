import { findBestDepositTarget } from 'Behaviors/Logistics';
import { moveTo } from 'Behaviors/moveTo';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionStatus, MissionType } from 'Missions/Mission';
import { byId } from 'Selectors/byId';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
import { roomPlans } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface PlunderMission extends Mission<MissionType.PLUNDER> {
  data: {
    capacity: number;
    targetRoom: string;
    plunderTarget?: Id<AnyStoreStructure>;
  };
}

export function createPlunderMission(office: string, targetRoom: string): PlunderMission {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, false);
  const capacity = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

  let priority = 7;
  let distance = getRangeTo(new RoomPosition(25, 25, office), new RoomPosition(25, 25, targetRoom));
  if (distance) {
    // Increase priority for closer targets, up to 1 point for closer than 50 squares
    // Round priority to two places
    priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
  }

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body)
  };

  return createMission({
    office,
    priority,
    type: MissionType.PLUNDER,
    data: {
      capacity,
      targetRoom
    },
    estimate
  });
}

export class Plunder extends MissionImplementation {
  static spawn(mission: PlunderMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office), 50, false);

    // Set name
    const name = `ACCOUNTANT-${mission.office}-${mission.id}`;

    mission.data.capacity ??= body.filter(p => p === CARRY).length * CARRY_CAPACITY;

    scheduleSpawn(mission.office, mission.priority, {
      name,
      body
    });

    mission.creepNames.push(name);
  }

  static minionLogic(mission: PlunderMission, creep: Creep): void {
    creep.memory.state ??= States.WITHDRAW;

    if (creep.memory.state === States.WITHDRAW) {
      if (creep.store.getFreeCapacity() === 0) creep.memory.state = States.DEPOSIT;
      if (creep.pos.roomName !== mission.data.targetRoom) {
        moveTo(creep, { pos: new RoomPosition(25, 25, mission.data.targetRoom), range: 20 });
        return;
      }

      mission.data.plunderTarget ??= Game.rooms[mission.data.targetRoom].find(FIND_HOSTILE_STRUCTURES, {
        filter: s => 'store' in s && Object.keys(s.store).length
      })[0]?.id as Id<AnyStoreStructure>;

      if (!mission.data.plunderTarget) {
        mission.status = MissionStatus.DONE;
        return;
      }

      const target = byId(mission.data.plunderTarget);
      const targetResource = target && (Object.keys(target.store)[0] as ResourceConstant | undefined);
      if (!targetResource) {
        delete mission.data.plunderTarget;
      }
      if (targetResource && creep.withdraw(target, targetResource) === ERR_NOT_IN_RANGE) {
        moveTo(creep, target.pos);
        return;
      }
    }
    if (creep.memory.state === States.DEPOSIT) {
      mission.efficiency.working += 1;
      if (creep.store.getUsedCapacity() === 0) creep.memory.state = States.WITHDRAW;
      const storage = findBestDepositTarget(mission.office, creep);
      const terminal = roomPlans(mission.office)?.headquarters?.terminal.structure;
      const nonEnergyResource = Object.keys(creep.store).find(c => c !== RESOURCE_ENERGY) as ResourceConstant;
      if (
        creep.store.getUsedCapacity(RESOURCE_ENERGY) &&
        storage &&
        creep.transfer(storage[1], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
      ) {
        moveTo(creep, storage[1].pos);
        return;
      } else if (nonEnergyResource && terminal && creep.transfer(terminal, nonEnergyResource) === ERR_NOT_IN_RANGE) {
        moveTo(creep, terminal.pos);
        return;
      }
    }
  }
}
