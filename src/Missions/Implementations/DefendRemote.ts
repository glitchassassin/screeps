import { blinkyKill } from 'Behaviors/blinkyKill';
import { guardKill } from 'Behaviors/guardKill';
import { moveTo } from 'Behaviors/moveTo';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { findClosestHostileCreepByRange, findInvaderStructures } from 'Selectors/findHostileCreeps';
import { minionCost } from 'Selectors/minionCostPerTick';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

interface DefendRemoteMissionData {
  roomTarget?: string;
  coreKiller: boolean;
}

export interface DefendRemoteMission extends Mission<MissionType.DEFEND_REMOTE> {
  data: DefendRemoteMissionData;
}

export function createDefendRemoteMission(office: string, coreKiller = false): DefendRemoteMission {
  const body = MinionBuilders[coreKiller ? MinionTypes.GUARD : MinionTypes.BLINKY](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body)
  };

  return createMission({
    office,
    priority: 9.9,
    type: MissionType.DEFEND_REMOTE,
    data: { coreKiller },
    estimate
  });
}

export class DefendRemote extends MissionImplementation {
  static spawn(mission: DefendRemoteMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `JANITOR-${mission.office}-${mission.id}`;
    const body = MinionBuilders[mission.data.coreKiller ? MinionTypes.GUARD : MinionTypes.BLINKY](
      spawnEnergyAvailable(mission.office)
    );

    scheduleSpawn(mission.office, mission.priority, {
      name,
      body
    });

    mission.creepNames.push(name);
  }

  static minionLogic(mission: DefendRemoteMission, creep: Creep) {
    // If work is done, clear target
    if (
      mission.data.roomTarget &&
      !(
        Memory.rooms[mission.data.roomTarget].invaderCore ||
        Memory.rooms[mission.data.roomTarget].lastHostileSeen === Memory.rooms[mission.data.roomTarget].scanned
      )
    ) {
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

    // Try to heal
    if (creep.hits < creep.hitsMax) {
      creep.heal(creep);
    }

    if (!mission.data.roomTarget) return; // nothing to do

    // Record cost
    // const sources = sourceIds(mission.data.roomTarget);
    // if (sources.length) {
    //   const cost = creepCostPerTick(creep) / sources.length;
    //   sources.forEach(s => HarvestLedger.record(mission.office, s, 'spawn_defense', -cost));
    // }

    // Go to room
    if (creep.pos.roomName !== mission.data.roomTarget) {
      moveTo(creep, { pos: new RoomPosition(25, 25, mission.data.roomTarget), range: 20 });
    }

    // Clear room
    const target = findClosestHostileCreepByRange(creep.pos) ?? findInvaderStructures(mission.data.roomTarget)[0];

    if (mission.data.coreKiller) {
      if (guardKill(creep, target)) {
        mission.efficiency.working += 1;
      }
    } else {
      if (blinkyKill(creep, target)) {
        mission.efficiency.working += 1;
      }
    }
  }
}
