import { guardKill } from "Behaviors/guardKill";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { findClosestHostileCreepByRange, findInvaderStructures } from "Selectors/findHostileCreeps";
import { minionCost } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

interface DefendRemoteMissionData {
  roomTarget?: string
}

export interface DefendRemoteMission extends Mission<MissionType.DEFEND_REMOTE> {
  data: DefendRemoteMissionData
}

export function createDefendRemoteMission(office: string): DefendRemoteMission {
  const body = MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.6,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority: 3,
    type: MissionType.DEFEND_REMOTE,
    data: {},
    estimate,
  })
}

export class DefendRemote extends MissionImplementation {
  static spawn(mission: DefendRemoteMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `GUARD-${mission.office}-${Game.time % 10000}-${Math.floor(Math.random() * 100)}`
    const body = MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(mission.office));

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

  static minionLogic(mission: DefendRemoteMission, creep: Creep) {
    // If work is done, clear target
    if (mission.data.roomTarget && !(
      Memory.rooms[mission.data.roomTarget].invaderCore ||
      Memory.rooms[mission.data.roomTarget].lastHostileSeen === Memory.rooms[mission.data.roomTarget].scanned
    )) {
      delete mission.data.roomTarget;
    }

    // If no target, pick one
    if (!mission.data.roomTarget) {
      for (const t of Memory.offices[mission.office].territories ?? []) {
        if (Memory.rooms[t].invaderCore || Memory.rooms[t].lastHostileSeen === Memory.rooms[t].scanned) {
          // Hostile minions or invader core detected
          mission.data.roomTarget = t;
        }
      }
    }

    if (!mission.data.roomTarget) return; // nothing to do

    // Go to room
    if (creep.pos.roomName !== mission.data.roomTarget) {
      moveTo(creep, { pos: new RoomPosition(25, 25, mission.data.roomTarget), range: 20 });
      return;
    }

    // Clear room
    const target = findClosestHostileCreepByRange(creep.pos) ?? findInvaderStructures(mission.data.roomTarget)[0];

    guardKill(creep, target);
  }
}
