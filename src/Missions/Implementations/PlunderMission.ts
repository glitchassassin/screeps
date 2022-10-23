import { findBestDepositTarget } from 'Behaviors/Logistics';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { getRoomPathDistance } from 'Selectors/Map/Pathing';
import { setArrived } from 'Selectors/prespawn';
import { sum } from 'Selectors/reducers';
import { roomPlans } from 'Selectors/roomPlans';

export interface PlunderMissionData extends BaseMissionData {
  targetRoom: string;
  plunderTarget?: Id<AnyStoreStructure>;
}

export class PlunderMission extends MissionImplementation {
  public creeps = {
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy),
      count: current => {
        if (
          neededPlunderCapacity(this.missionData.office, this.missionData.targetRoom) >
          current.map(c => c.store.getCapacity()).reduce(sum, 0)
        ) {
          return 1; // more haulers needed
        }
        return 0; // we are at capacity
      }
    })
  };

  priority = 5;

  constructor(public missionData: PlunderMissionData, id?: string) {
    super(missionData, id);
    let distance = getRangeTo(
      new RoomPosition(25, 25, missionData.office),
      new RoomPosition(25, 25, missionData.targetRoom)
    );
    if (distance) {
      // Increase priority for closer targets, up to 1 point for closer than 50 squares
      // Round priority to two places
      this.priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
    }
  }
  static fromId(id: PlunderMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  run(creeps: ResolvedCreeps<PlunderMission>, missions: ResolvedMissions<PlunderMission>, data: PlunderMissionData) {
    const { haulers } = creeps;

    for (const creep of haulers) {
      runStates(
        {
          [States.WITHDRAW]: (data, creep) => {
            if (creep.store.getFreeCapacity() === 0) creep.memory.state = States.DEPOSIT;
            if (creep.pos.roomName !== data.targetRoom) {
              moveTo(creep, { pos: new RoomPosition(25, 25, data.targetRoom), range: 20 });
              return States.WITHDRAW;
            }

            data.plunderTarget ??= Game.rooms[data.targetRoom].find(FIND_HOSTILE_STRUCTURES, {
              filter: s => 'store' in s && s.structureType !== STRUCTURE_NUKER && Object.keys(s.store).length
            })[0]?.id as Id<AnyStoreStructure>;

            if (!data.plunderTarget) {
              return States.DEPOSIT;
            }

            const target = byId(data.plunderTarget);
            const targetResource = target && (Object.keys(target.store)[0] as ResourceConstant | undefined);

            if (!targetResource) {
              delete data.plunderTarget;
            } else {
              if (creep.withdraw(target, targetResource) === ERR_NOT_IN_RANGE) {
                moveTo(creep, { pos: target.pos, range: 1 });
                const opportunityTarget = creep.pos
                  .findInRange(FIND_HOSTILE_STRUCTURES, 1)
                  .find(s => 'store' in s && Object.keys(s.store).length) as AnyStoreStructure | undefined;
                if (opportunityTarget) {
                  const opportunityResource = Object.keys(opportunityTarget.store)[0] as ResourceConstant | undefined;
                  if (opportunityResource) creep.withdraw(opportunityTarget, opportunityResource);
                }
                return States.WITHDRAW;
              } else {
                // withdrew successfully, or another error
                setArrived(creep);
              }
            }
            return States.WITHDRAW;
          },
          [States.DEPOSIT]: (data, creep) => {
            if (creep.store.getUsedCapacity() === 0) {
              if (!creep.memory.arrived || (creep.ticksToLive ?? CREEP_LIFE_TIME) > creep.memory.arrived) {
                return States.WITHDRAW;
              } else {
                recycle(data, creep);
              }
            }
            const depositTarget = findBestDepositTarget(data.office, creep);
            const terminal = roomPlans(data.office)?.headquarters?.terminal.structure;
            const storage = roomPlans(data.office)?.headquarters?.storage.structure;
            const nonEnergyResource = Object.keys(creep.store).find(c => c !== RESOURCE_ENERGY) as ResourceConstant;
            if (
              creep.store.getUsedCapacity(RESOURCE_ENERGY) &&
              depositTarget &&
              creep.transfer(depositTarget[1], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
            ) {
              moveTo(creep, depositTarget[1].pos);
              return States.DEPOSIT;
            } else if (nonEnergyResource) {
              if (terminal && creep.transfer(terminal, nonEnergyResource) === ERR_NOT_IN_RANGE) {
                moveTo(creep, { pos: terminal.pos, range: 1 });
                return States.DEPOSIT;
              } else if (storage && creep.transfer(storage, nonEnergyResource) === ERR_NOT_IN_RANGE) {
                moveTo(creep, { pos: storage.pos, range: 1 });
                return States.DEPOSIT;
              } else if (!terminal && !storage) {
                creep.drop(nonEnergyResource);
              }
            }
            return States.DEPOSIT;
          }
        },
        this.missionData,
        creep
      );
    }
  }
}

const neededPlunderCapacity = (office: string, room: string) => {
  let distance = (getRoomPathDistance(office, room) ?? 2) * 50;
  let trips = CREEP_LIFE_TIME / distance;
  let capacity = Memory.rooms[room]?.lootEnergy ?? 0;
  if (roomPlans(office)?.headquarters?.terminal) {
    capacity += Memory.rooms[room]?.lootResources ?? 0;
  }
  capacity /= trips;
  return capacity;
};
