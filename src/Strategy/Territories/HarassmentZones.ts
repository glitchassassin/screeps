import { THREAT_TOLERANCE } from 'config';
import { ScannedRoomEvent } from 'Intel/events';
import { getCachedPath } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { combatStats } from 'Selectors/Combat/combatStats';
import { findHostileCreeps } from 'Selectors/findHostileCreeps';
import { posById } from 'Selectors/posById';
import { rcl } from 'Selectors/rcl';
import { memoizeByTick } from 'utils/memoizeFunction';
import { visualizeRoomCluster } from 'utils/visualizeRoomCluster';

interface Zone {
  score: number; // max threat observed
  rhythm: number; // approximate cycle length - k-clusters?
  attacker: string; // with office, index for zones
  territories: string[]; // territory where threat is detected, or which paths through threatened room
  lastActive: number; // last time hostile was seen
  confirmed: boolean; // attacker is confirmed dangerous
}

Memory.zones ??= {};

const totalThreatScore = memoizeByTick(
  attacker => attacker,
  attacker => ({ threat: 0 })
);

export const recordThreat = (attacker: string, score: number, territory: string) => {
  if (score <= 0) return;
  if (['Source Keeper', 'Invader'].includes(attacker)) return;
  const zone = Memory.zones[attacker] ?? {
    score: 0,
    rhythm: 3000,
    attacker,
    territories: [],
    lastActive: Game.time,
    confirmed: false
  };
  Memory.zones[attacker] = zone;

  // track the attacker's total visible threat for a given tick
  const threatScore = totalThreatScore(attacker);
  threatScore.threat += score;

  zone.score = Math.max(zone.score, threatScore.threat);
  if (!zone.territories.includes(territory)) zone.territories.push(territory);
  zone.lastActive = Game.time;
};

export const confirmThreat = (attacker: string) => {
  const zone = Memory.zones[attacker];
  if (zone) zone.confirmed = true;
};

export const cleanThreats = () => {
  for (const attacker in Memory.zones) {
    const zone = Memory.zones[attacker];
    if (Game.time - zone.lastActive > zone.rhythm) {
      delete Memory.zones[attacker];
    }
  }
};

export const scanRoomForThreats = ({ room }: ScannedRoomEvent) => {
  const hostiles = findHostileCreeps(room);
  hostiles.forEach(h => recordThreat(h.owner.username, combatStats(h).score, room));
  if (hostiles.length) {
    Game.rooms[room].getEventLog().forEach(e => {
      if (e.event === EVENT_ATTACK) {
        const attacker = byId(e.objectId as Id<Creep>);
        const defender = byId(e.data.targetId as Id<AnyCreep | AnyOwnedStructure>);
        if (attacker && defender?.my && !attacker?.my) {
          confirmThreat(attacker.owner.username);
        }
      }
    });
  }
};

export const franchiseIsThreatened = (office: string, franchise: Id<Source>) => {
  if (posById(franchise)?.roomName === office) return false;
  const rooms = (getCachedPath(office + franchise) ?? []).reduce((rooms, pos) => {
    if (!rooms.includes(pos.roomName)) rooms.push(pos.roomName);
    return rooms;
  }, [] as string[]);

  let threat = 0;
  for (const attacker in Memory.zones) {
    const zone = Memory.zones[attacker];
    if (zone.confirmed && rooms.some(r => zone.territories.includes(r))) {
      threat += zone.score;
    }
  }

  if (threat > THREAT_TOLERANCE.remote[rcl(office)]) {
    return true;
  }
  return false;
};

export const roomThreatLevel = (room: string) => {
  let threat = 0;

  for (const attacker in Memory.zones) {
    const zone = Memory.zones[attacker];
    if (zone.confirmed && zone.territories.includes(room)) {
      threat += zone.score;
    }
  }

  return threat;
};

export const visualizeHarassmentZones = () => {
  for (const attacker in Memory.zones) {
    const zone = Memory.zones[attacker];
    visualizeRoomCluster(zone.territories, { color: zone.confirmed ? '#ff0000' : '#ffff00', width: 1 });
    zone.territories.forEach(room => {
      Game.map.visual.text(zone.attacker, new RoomPosition(5, 5, room), { align: 'left', fontSize: 4 });
      Game.map.visual.text(zone.score.toFixed(0), new RoomPosition(5, 10, room), { align: 'left', fontSize: 4 });
    });
  }
};

declare global {
  namespace NodeJS {
    interface Global {
      recordThreat: (attacker: string, score: number, territory: string) => void;
    }
  }
  interface Memory {
    zones: Record<string, Zone>;
  }
}
global.recordThreat = recordThreat;
