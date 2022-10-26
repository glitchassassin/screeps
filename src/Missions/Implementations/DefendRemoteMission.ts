import { blinkyKill } from 'Behaviors/blinkyKill';
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
import { totalCreepStats } from 'Selectors/Combat/combatStats';
import { findClosestHostileCreepByRange, findHostileCreeps, findInvaderStructures } from 'Selectors/findHostileCreeps';

export interface DefendRemoteMissionData extends BaseMissionData {
  targetRoom?: string;
}

export class DefendRemoteMission extends MissionImplementation {
  public creeps = {
    blinkies: new MultiCreepSpawner('b', this.missionData.office, {
      role: MinionTypes.BLINKY,
      budget: Budget.EFFICIENCY,
      body: energy => MinionBuilders[MinionTypes.BLINKY](energy),
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

  constructor(public missionData: DefendRemoteMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: DefendRemoteMission['id']) {
    return super.fromId(id) as DefendRemoteMission;
  }

  run(
    creeps: ResolvedCreeps<DefendRemoteMission>,
    missions: ResolvedMissions<DefendRemoteMission>,
    data: DefendRemoteMissionData
  ) {
    const { blinkies } = creeps;

    // If work is done, clear target
    if (
      data.targetRoom &&
      !(
        Memory.rooms[data.targetRoom].invaderCore ||
        Memory.rooms[data.targetRoom].lastHostileSeen === Memory.rooms[data.targetRoom].scanned
      )
    ) {
      delete data.targetRoom;
    }

    // If no target, pick one
    if (!data.targetRoom) {
      for (const t of Memory.offices[data.office].territories ?? []) {
        if (Memory.rooms[t].invaderCore || Memory.rooms[t].lastHostileSeen === Memory.rooms[t].scanned) {
          // Hostile minions or invader core detected
          data.targetRoom = t;
        }
      }
    }

    for (const creep of blinkies) {
      // Try to heal
      if (creep.hits < creep.hitsMax) {
        creep.heal(creep);
      }

      if (!data.targetRoom) return; // nothing to do

      // Go to room
      if (creep.pos.roomName !== data.targetRoom) {
        moveTo(creep, { pos: new RoomPosition(25, 25, data.targetRoom), range: 20 });
      }

      // Clear room
      const target = findClosestHostileCreepByRange(creep.pos) ?? findInvaderStructures(data.targetRoom)[0];

      blinkyKill(creep, target);
    }
  }
}
