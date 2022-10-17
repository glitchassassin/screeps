import { BehaviorResult } from 'Behaviors/Behavior';
import { signRoom } from 'Behaviors/signRoom';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { getPatrolRoute } from 'Selectors/getPatrolRoute';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

const DEBUG = true;

export interface ExploreMission extends Mission<MissionType.EXPLORE> {
  data: {
    exploreTarget?: string | undefined;
  };
}

export function createExploreOrder(office: string): SpawnOrder {
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.3,
    energy: 0
  };

  const mission = createMission({
    office,
    priority: 15,
    type: MissionType.EXPLORE,
    data: {},
    estimate
  });

  const name = `AUDITOR-${mission.office}-${mission.id}`;
  const body = MinionBuilders[MinionTypes.AUDITOR](spawnEnergyAvailable(mission.office));

  return createSpawnOrder(mission, {
    name,
    body
  });
}

export class Explore extends MissionImplementation {
  static minionLogic(mission: Mission<MissionType>, creep: Creep): void {
    // Select a target
    if (!mission.data.exploreTarget) {
      // Ignore aggression on scouts
      creep.notifyWhenAttacked(false);

      let rooms = getPatrolRoute(mission.office).map(room => ({
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
      mission.data.exploreTarget = bestMatch?.name;
    }

    // Do work
    if (mission.data.exploreTarget) {
      if (DEBUG) Game.map.visual.line(creep.pos, new RoomPosition(25, 25, mission.data.exploreTarget));
      mission.efficiency.working += 1;
      if (!Game.rooms[mission.data.exploreTarget]) {
        if (
          moveTo(
            creep,
            {
              pos: new RoomPosition(25, 25, mission.data.exploreTarget),
              range: 20
            },
            {
              sourceKeeperRoomCost: 2
            }
          ) !== OK
        ) {
          // console.log('Failed to path', creep.pos, mission.data.exploreTarget);
          Memory.rooms[mission.data.exploreTarget] ??= { officesInRange: '', franchises: {} }; // Unable to path
          Memory.rooms[mission.data.exploreTarget].scanned = Game.time;
          delete mission.data.exploreTarget;
          return;
        }
      } else {
        const controller = Game.rooms[mission.data.exploreTarget].controller;
        if (
          creep.pos.roomName === mission.data.exploreTarget &&
          controller &&
          controller.sign?.username !== 'LordGreywether'
        ) {
          // Room is visible, creep is in room
          // In room, sign controller
          if (signRoom(creep, mission.data.exploreTarget) === BehaviorResult.INPROGRESS) return;
          // otherwise, successful or no path found
        }
        delete mission.data.exploreTarget;
        return;
      }
    }
  }
}
