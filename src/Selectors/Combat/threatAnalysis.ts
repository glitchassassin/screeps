import { FEATURES, WHITELIST } from 'config';
import { creepStats } from 'Selectors/creepStats';
import { findHostileCreeps } from 'Selectors/findHostileCreeps';
import { isSourceKeeperRoom } from 'Selectors/Map/MapCoordinates';
import { memoizeByTick } from 'utils/memoizeFunction';
import { totalCreepStats } from './combatStats';

export enum ThreatLevel {
  NONE = 'NONE', // No hostile minions or structures
  UNKNOWN = 'UNKNOWN', // No hostile minions or structures
  UNOWNED = 'UNOWNED', // Unclaimed, no active operations
  REMOTE = 'REMOTE', // Enemy is actively harvesting
  OWNED = 'OWNED', // Enemy-owned room
  FRIENDLY = 'FRIENDLY', // Our room or ally's
  MIDNIGHT = 'MIDNIGHT' // The Man with the Golden Face
}

// TODO: Update with threat from towers
export const calculateThreatLevel = (room: string): [ThreatLevel, number] => {
  const controller = Game.rooms[room].controller;
  const hostiles = totalCreepStats(findHostileCreeps(room));

  // No controller, no hostile creeps
  if (!controller) {
    if (hostiles.count === 0) return [ThreatLevel.NONE, 0];
    return [ThreatLevel.UNOWNED, hostiles.score];
  }

  // Source keeper room - actively harvested or not?
  if (isSourceKeeperRoom(room)) {
    if (hostiles.harvest) {
      return [ThreatLevel.REMOTE, hostiles.score];
    } else {
      return [ThreatLevel.UNOWNED, hostiles.score];
    }
  }

  // Unowned room - actively harvested or not?
  if (!controller.owner) {
    if (
      controller.reservation &&
      (WHITELIST.includes(controller.reservation.username) || controller.reservation.username === 'LordGreywether')
    ) {
      return [ThreatLevel.FRIENDLY, hostiles.score]; // Friendly remote
    } else if (hostiles.harvest || controller.reservation) {
      return [ThreatLevel.REMOTE, hostiles.score];
    } else {
      return [ThreatLevel.UNOWNED, hostiles.score];
    }
  }

  // Owned room - friendly?
  if (controller.my || (FEATURES.WHITELIST && WHITELIST.includes(controller.owner.username))) {
    return [ThreatLevel.FRIENDLY, hostiles.score];
  }

  // Then it's hostile
  return [ThreatLevel.OWNED, hostiles.score];
};

export const calculateDefensiveThreatLevel = memoizeByTick(
  office => office,
  (office: string): number => {
    return creepStats(findHostileCreeps(office)).attack;
  }
);
