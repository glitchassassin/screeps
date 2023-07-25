import { blinkyKill } from 'Behaviors/blinkyKill';
import { recycle } from 'Behaviors/recycle';
import { buildBlinky } from 'Minions/Builds/blinky';
import { MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { totalCreepStats } from 'Selectors/Combat/combatStats';
import { findClosestHostileCreepByRange, findHostileCreeps, findHostileStructures } from 'Selectors/findHostileCreeps';

export interface ManualAttackMissionData extends BaseMissionData {
  targetRoom?: string;
}

export class ManualAttackMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  public creeps = {
    blinkies: new MultiCreepSpawner('b', this.missionData.office, {
      role: MinionTypes.BLINKY,
      budget: this.budget,
      builds: energy => buildBlinky(energy),
      count: current => {
        if (
          this.missionData.targetRoom &&
          totalCreepStats(findHostileCreeps(this.missionData.targetRoom)).score > totalCreepStats(current).score
        ) {
          return 1; // need more defenders
        }
        return 0; // our heuristic is higher
      }
    })
  };

  priority = 12;
  initialEstimatedCpuOverhead = 0.2;

  constructor(
    public missionData: ManualAttackMissionData,
    id?: string
  ) {
    super(missionData, id);
  }
  static fromId(id: ManualAttackMission['id']) {
    return super.fromId(id) as ManualAttackMission;
  }

  run(
    creeps: ResolvedCreeps<ManualAttackMission>,
    missions: ResolvedMissions<ManualAttackMission>,
    data: ManualAttackMissionData
  ) {
    const { blinkies } = creeps;

    // If work is done, clear target
    if (
      data.targetRoom &&
      !(
        Memory.rooms[data.targetRoom].lastHostileSeen === Memory.rooms[data.targetRoom].scanned ||
        findHostileStructures(data.targetRoom).length > 0
      )
    ) {
      delete data.targetRoom
    }

    this.logCpu('overhead');

    // console.log('defending remote', data.targetRoom);

    for (const creep of blinkies) {
      // Try to heal
      if (creep.hits < creep.hitsMax) {
        creep.heal(creep);
      }

      if (!data.targetRoom) {
        recycle(data, creep); // nothing to do
        continue;
      }

      // Go to room
      if (creep.pos.roomName !== data.targetRoom) {
        moveTo(creep, { pos: new RoomPosition(25, 25, data.targetRoom), range: 20 });
      }

      // Clear room
      const target = findClosestHostileCreepByRange(creep.pos) ?? findHostileStructures(data.targetRoom)[0];

      blinkyKill(creep, target);
    }

    this.logCpu('creeps');
  }
}
