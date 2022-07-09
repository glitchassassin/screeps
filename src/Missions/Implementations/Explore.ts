import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { getPatrolRoute } from "Selectors/getPatrolRoute";
import { minionCost } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface ExploreMission extends Mission<MissionType.EXPLORE> {
  data: {
    exploreTarget?: string|undefined
  }
}

export function createExploreMission(office: string): ExploreMission {
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(MinionBuilders[MinionTypes.AUDITOR](spawnEnergyAvailable(office))),
  }

  return createMission({
    office,
    priority: 15,
    type: MissionType.EXPLORE,
    data: {},
    estimate,
  })
}

export class Explore extends MissionImplementation {
  static spawn(mission: ExploreMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `AUDITOR-${mission.office}-${Game.time % 10000}-${Math.floor(Math.random() * 100)}`
    const body = MinionBuilders[MinionTypes.AUDITOR](spawnEnergyAvailable(mission.office));

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

      const bestMatch = rooms
        .reduce((last, match) => {
          // Ignore rooms we've already scanned for now
          if (last === undefined) return match;
          if ((match.scanned ?? 0) >= (last.scanned ?? 0)) {
            return last;
          }
          return match;
        })
      mission.data.exploreTarget = bestMatch?.name;
    }

    // Do work
    if (mission.data.exploreTarget) {
      if (!Game.rooms[mission.data.exploreTarget]) {
        if (moveTo(creep, {pos: new RoomPosition(25, 25, mission.data.exploreTarget), range: 20}) === BehaviorResult.FAILURE) {
          // console.log('Failed to path', creep.pos, mission.data.exploreTarget);
          Memory.rooms[mission.data.exploreTarget] ??= { officesInRange: '', officePaths: {} }; // Unable to path
          Memory.rooms[mission.data.exploreTarget].scanned = Game.time;
          delete mission.data.exploreTarget;
          return;
        }
      } else {
        const controller = Game.rooms[mission.data.exploreTarget].controller;
        if (creep.pos.roomName === mission.data.exploreTarget && controller && controller.sign?.username !== 'LordGreywether') {
          // Room is visible, creep is in room
          // In room, sign controller
          const result = moveTo(creep, { pos: controller.pos, range: 1 });
          creep.signController(controller, 'This sector property of the Grey Company');
          if (result === BehaviorResult.INPROGRESS) return;
          // otherwise, successful or no path found
        }
        delete mission.data.exploreTarget;
        return;
      }
    }
  }
}
