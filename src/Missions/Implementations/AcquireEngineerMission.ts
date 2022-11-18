import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import { ResolvedCreeps, ResolvedMissions } from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { EngineerQueue } from 'RoomPlanner/EngineerQueue';
import { cachePath, moveByPath, moveTo } from 'screeps-cartographer';
import { isSpawned } from 'Selectors/isSpawned';
import { rcl } from 'Selectors/rcl';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { EngineerMission, EngineerMissionData } from './EngineerMission';

export interface AcquireEngineerMissionData extends EngineerMissionData {
  initialized?: string[];
  targetOffice: string;
}

export class AcquireEngineerMission extends EngineerMission {
  budget = Budget.SURPLUS;
  public creeps = {
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      builds: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy, 25, false, false),
      count: current => {
        if (rcl(this.missionData.targetOffice) > 4) return 0;
        const controller = Game.rooms[this.missionData.targetOffice]?.controller;
        if (!controller) return 0;
        if (current.length < this.creeps.engineers.resolved.length) return 1;
        return 0;
      },
      estimatedCpuPerTick: 1
    }),
    engineers: new MultiCreepSpawner('e', this.missionData.office, {
      role: MinionTypes.ENGINEER,
      builds: energy => MinionBuilders[MinionTypes.ENGINEER](energy, false),
      count: current => {
        if (rcl(this.missionData.targetOffice) > 4) return 0;
        const controller = Game.rooms[this.missionData.targetOffice]?.controller;
        if (!controller) return 0;
        let pendingCost = this.queue.analysis().energyRemaining;
        // If rcl < 2, engineers will also upgrade
        if (rcl(this.missionData.targetOffice) < 2) {
          pendingCost += controller.progressTotal - controller.progress;
        } else {
          // above RCL2, let repair work accumulate before spawning
          if (this.queue.build.size === 0 && pendingCost < 1500) {
            pendingCost = 0;
          }
        }
        if (this.estimatedEnergyRemaining < pendingCost) return 1;
        return 0;
      },
      estimatedCpuPerTick: 1
    })
  };

  priority = 8;
  queue: EngineerQueue;
  constructor(public missionData: AcquireEngineerMissionData, id?: string) {
    super(missionData, id);
    this.queue = new EngineerQueue(missionData.targetOffice);
  }

  static fromId(id: AcquireEngineerMission['id']) {
    return super.fromId(id) as AcquireEngineerMission;
  }

  run(
    creeps: ResolvedCreeps<AcquireEngineerMission>,
    missions: ResolvedMissions<AcquireEngineerMission>,
    data: AcquireEngineerMissionData
  ) {
    const { engineers, haulers } = creeps;

    // cache inter-room route
    const from = roomPlans(data.office)?.headquarters?.storage.pos;
    const to = roomPlans(data.targetOffice)?.headquarters?.storage.pos;
    if (!from || !to) return;

    cachePath(this.id, from, { pos: to, range: 1 }, { reusePath: 1500 });

    if (rcl(this.missionData.targetOffice) > 4 && engineers.length === 0) {
      this.status = MissionStatus.DONE;
    }

    // run engineers
    data.initialized ??= [];
    for (const engineer of engineers) {
      // move engineer to target room by following preset path
      if (data.initialized.includes(engineer.name)) continue;
      if (engineer.pos.roomName === data.targetOffice) {
        data.initialized.push(engineer.name);
        continue;
      }
      moveByPath(engineer, this.id);
    }
    super.run({ engineers: engineers.filter(e => data.initialized?.includes(e.name)) }, missions, {
      office: data.targetOffice
    });

    // run haulers
    const spawn = getSpawns(data.targetOffice).find(s => s.store.getFreeCapacity(RESOURCE_ENERGY));
    const storage = Game.rooms[data.targetOffice]?.storage;
    // target engineer with the most free capacity
    const inRoomEngineers = engineers.filter(e => e.pos.roomName === data.targetOffice);
    const engineer = inRoomEngineers.length
      ? inRoomEngineers.reduce((e1, e2) => (e2.store.getFreeCapacity() > e1.store.getFreeCapacity() ? e2 : e1))
      : undefined;
    for (const hauler of haulers.filter(isSpawned)) {
      // Load up with energy from sponsor office
      runStates(
        {
          [States.DEPOSIT]: (data, creep) => {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return States.WITHDRAW;
            if (creep.pos.roomName !== data.targetOffice) {
              moveByPath(creep, this.id);
              return States.DEPOSIT;
            }
            if (spawn) {
              moveTo(creep, spawn);
              creep.transfer(spawn, RESOURCE_ENERGY);
            } else if (storage?.store.getFreeCapacity()) {
              moveTo(creep, storage);
              creep.transfer(storage, RESOURCE_ENERGY);
            } else if (engineer) {
              moveTo(creep, engineer);
              creep.transfer(engineer, RESOURCE_ENERGY);
            } else {
              moveTo(creep, { pos: new RoomPosition(25, 25, data.targetOffice), range: 20 });
            }
            return States.DEPOSIT;
          },
          [States.WITHDRAW]: (data, creep) => {
            if (creep.pos.roomName !== data.office) {
              moveByPath(creep, this.id, { reverse: true });
              return States.WITHDRAW;
            }
            return withdraw(true)({ office: data.office }, creep);
          },
          [States.RECYCLE]: recycle
        },
        data,
        hauler
      );
    }
  }
}
