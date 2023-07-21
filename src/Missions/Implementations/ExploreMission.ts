import { BehaviorResult } from 'Behaviors/Behavior';
import { signRoom } from 'Behaviors/signRoom';
import { buildAuditor } from 'Minions/Builds/auditor';
import { MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { getPatrolRoute } from 'Selectors/getPatrolRoute';
import { roomPlans } from 'Selectors/roomPlans';

export interface ExploreMissionData extends BaseMissionData {
  exploreTarget?: string | undefined;
}

export class ExploreMission extends MissionImplementation {
  budget = Budget.ESSENTIAL;
  public creeps = {
    explorer: new CreepSpawner('x', this.missionData.office, {
      role: MinionTypes.AUDITOR,
      budget: this.budget,
      builds: energy => buildAuditor(),
      respawn: () => !roomPlans(this.missionData.office)?.backfill?.observer.structure // skip explorers once we have an observer
    })
  };

  priority = 15;
  initialEstimatedCpuOverhead = 0.25;

  constructor(
    public missionData: ExploreMissionData,
    id?: string
  ) {
    super(missionData, id);
  }
  static fromId(id: ExploreMission['id']) {
    return super.fromId(id) as ExploreMission;
  }

  run(creeps: ResolvedCreeps<ExploreMission>, missions: ResolvedMissions<ExploreMission>, data: ExploreMissionData) {
    const { explorer } = creeps;

    if (!explorer) return;

    // Select a target
    if (!this.missionData.exploreTarget && Game.cpu.bucket > 1000) {
      // Ignore aggression on scouts
      explorer.notifyWhenAttacked(false);

      let rooms = getPatrolRoute(this.missionData.office).map(room => ({
        name: room,
        scanned: Memory.rooms[room]?.scanned
      }));

      if (!rooms.length) return;

      const bestMatch = rooms.reduce((last, match) => {
        // Ignore rooms we've already scanned for now
        if (last === undefined) return match;
        if ((match.scanned ?? 0) >= (last.scanned ?? 0)) {
          return last;
        }
        return match;
      });
      this.missionData.exploreTarget = bestMatch?.name;
      // logCpu('select a target');
    }

    this.logCpu('overhead');

    // Do work
    if (this.missionData.exploreTarget) {
      if (!Game.rooms[this.missionData.exploreTarget]) {
        if (
          moveTo(
            explorer,
            {
              pos: new RoomPosition(25, 25, this.missionData.exploreTarget),
              range: 20
            },
            {
              sourceKeeperRoomCost: 2
            }
          ) !== OK
        ) {
          // console.log('Failed to path', explorer.pos, this.missionData.exploreTarget);
          Memory.rooms[this.missionData.exploreTarget] ??= { officesInRange: '' }; // Unable to path
          Memory.rooms[this.missionData.exploreTarget].scanned = Game.time;
          delete this.missionData.exploreTarget;
          // logCpu('failed move to target room');
          return;
        }
        // logCpu('move to target room');
      } else {
        const controller = Game.rooms[this.missionData.exploreTarget].controller;
        if (
          explorer.pos.roomName === this.missionData.exploreTarget &&
          controller &&
          controller.sign?.username !== 'LordGreywether'
        ) {
          // Room is visible, creep is in room
          // In room, sign controller
          const result = signRoom(explorer, this.missionData.exploreTarget);
          // logCpu('signing room');
          if (result === BehaviorResult.INPROGRESS) return;
          // otherwise, successful or no path found
        }
        delete this.missionData.exploreTarget;
        return;
      }
    }

    this.logCpu('creeps');
  }
}
