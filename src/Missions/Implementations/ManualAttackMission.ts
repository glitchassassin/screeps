import { blinkyKill } from 'Behaviors/blinkyKill';
import { recycle } from 'Behaviors/recycle';
import { buildBlinkyWithBoosts } from 'Minions/Builds/blinky';
import { isTier } from 'Minions/Builds/utils';
import { MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { totalCreepStats } from 'Selectors/Combat/combatStats';
import { findClosestHostileCreepByRange, findHostileCreeps, findHostileStructures } from 'Selectors/findHostileCreeps';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';

export interface ManualAttackMissionData extends BaseMissionData {
  flag: string;
}

export class ManualAttackMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  public creeps = {
    blinkies: new MultiCreepSpawner('b', this.missionData.office, {
      role: MinionTypes.BLINKY,
      budget: this.budget,
      builds: energy => buildBlinkyWithBoosts(energy).filter(isTier(3)),
      count: current => {
        if (
          this.targetRoom() &&
          totalCreepStats(findHostileCreeps(this.targetRoom())).score > totalCreepStats(current).score
        ) {
          return 1; // need more defenders
        } else if (!current.length) {
          return 1;
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

  flag() {
    return Game.flags[this.missionData.flag];
  }

  targetRoom() {
    return this.flag()?.pos.roomName;
  }

  onStart(): void {
    super.onStart();
    console.log('[ManualAttackMission] started targeting', this.targetRoom())
  }

  run(
    creeps: ResolvedCreeps<ManualAttackMission>,
    missions: ResolvedMissions<ManualAttackMission>,
    data: ManualAttackMissionData
  ) {
    const { blinkies } = creeps;

    if (blinkies.length) console.log('blinkies', blinkies.length);

    const flag = this.flag();

    if (!flag && blinkies.length === 0) {
      this.status = MissionStatus.DONE;
    }

    // If work is done, clear target
    const safemode = Memory.rooms[this.targetRoom()]?.safeModeEnds
    if (
      flag &&
      !(
        Memory.rooms[this.targetRoom()]?.lastHostileSeen === Memory.rooms[this.targetRoom()]?.scanned ||
        findHostileStructures(this.targetRoom()).length > 0
      ) ||
      safemode && safemode - Game.time >= 500
    ) {
      flag?.remove();
    }

    this.logCpu('overhead');

    for (const creep of blinkies) {
      // Try to heal
      if (creep.hits < creep.hitsMax) {
        creep.heal(creep);
      }

      if (!flag) {
        recycle(data, creep); // nothing to do
        continue;
      }

      // Go to room
      if (creep.pos.roomName !== flag.pos.roomName) {
        moveTo(creep, { pos: new RoomPosition(25, 25, flag.pos.roomName), range: 20 });
      }

      // Clear room
      const target = findClosestHostileCreepByRange(creep.pos) ?? getClosestByRange(creep.pos, findHostileStructures(flag.pos.roomName));

      blinkyKill(creep, target);
    }

    this.logCpu('creeps');
  }
}
