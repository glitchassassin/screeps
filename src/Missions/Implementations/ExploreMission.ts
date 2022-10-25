import { BehaviorResult } from 'Behaviors/Behavior';
import { signRoom } from 'Behaviors/signRoom';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
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

export interface ExploreMissionData extends BaseMissionData {
  exploreTarget?: string | undefined;
}

export class ExploreMission extends MissionImplementation {
  public creeps = {
    explorer: new CreepSpawner('x', this.missionData.office, {
      role: MinionTypes.AUDITOR,
      budget: Budget.ESSENTIAL,
      body: energy => MinionBuilders[MinionTypes.AUDITOR](energy),
      respawn: () => true
    })
  };

  priority = 15;

  constructor(public missionData: ExploreMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: ExploreMission['id']) {
    return super.fromId(id) as ExploreMission;
  }

  run(creeps: ResolvedCreeps<ExploreMission>, missions: ResolvedMissions<ExploreMission>, data: ExploreMissionData) {
    const { explorer } = creeps;

    if (!explorer) return;

    // Select a target
    if (!this.missionData.exploreTarget) {
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
          Memory.rooms[this.missionData.exploreTarget] ??= { officesInRange: '', franchises: {} }; // Unable to path
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
  }
}
