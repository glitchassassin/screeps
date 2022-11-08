import { byId } from 'Selectors/byId';
import { combatStats } from 'Selectors/Combat/combatStats';
import { findHostileCreeps } from 'Selectors/findHostileCreeps';
import { franchisePath } from 'Selectors/plannedTerritoryRoads';
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

export const scanRoomForThreats = (territory: string) => {
  const hostiles = findHostileCreeps(territory);
  hostiles.forEach(h => recordThreat(h.owner.username, combatStats(h).score, territory));
  if (hostiles.length) {
    Game.rooms[territory].getEventLog().forEach(e => {
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

  zone.score = Math.max(zone.score, score);
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
      // delete Memory.zones[attacker];
    }
  }
};

export const isThreatened = (office: string, franchise: Id<Source>) => {
  const rooms = franchisePath(office, franchise).reduce((rooms, pos) => {
    if (!rooms.includes(pos.roomName)) rooms.push(pos.roomName);
    return rooms;
  }, [] as string[]);

  for (const attacker in Memory.zones) {
    const zone = Memory.zones[attacker];
    if (rooms.some(r => zone.territories.includes(r))) {
      rooms.forEach(room =>
        Game.map.visual.text(zone.attacker + ' ' + zone.score, new RoomPosition(25, 5, room), { fontSize: 4 })
      );
      return zone.confirmed;
    }
  }

  return false;
};

export const visualizeHarassmentZones = () => {
  for (const attacker in Memory.zones) {
    const zone = Memory.zones[attacker];
    visualizeRoomCluster(zone.territories, { color: zone.confirmed ? '#ff0000' : '#ffff00', width: 1 });
    zone.territories.forEach(room =>
      Game.map.visual.text(zone.attacker, new RoomPosition(5, 5, room), { align: 'left', fontSize: 4 })
    );
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
