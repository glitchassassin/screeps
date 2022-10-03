import { OFFICE_LIMIT } from 'config';
import { roomPlans } from 'Selectors/roomPlans';
import { getOfficeDistanceByRoomPath } from '../../Selectors/getOfficeDistance';
import { rcl } from '../../Selectors/rcl';
import { scoreAcquireTarget } from './scoreAcquireTarget';

let cachedAcquireTarget: string | undefined;

declare global {
  interface RoomMemory {
    acquire?: boolean;
  }
}

const timeSince = (time: number | undefined) => Game.time - (time ?? 0);

/**
 * If GCL <= Memory.offices.length, return
 * If an Acquire target is already saved (and still valid), use that
 * Otherwise, for each office, find the closest room plan that isn't
 * already an office. The closest is the winner.
 */
export const findAcquireTarget = () => {
  const offices = Object.keys(Memory.offices);

  if (offices.length >= OFFICE_LIMIT || Game.cpu.limit / offices.length <= 5) return undefined; // Don't spread ourselves out too thin

  if (cachedAcquireTarget && acquireTargetIsValid(cachedAcquireTarget) && !shouldPostponeAcquire(cachedAcquireTarget)) {
    return cachedAcquireTarget;
  } else {
    cachedAcquireTarget = undefined;
  }

  if ((Game.time + 25) % 50 !== 0) return undefined;

  // No cached target, scan for an acceptable one
  let bestTarget: string | undefined;
  let bestScore: number = Infinity;

  // Look for acquire/support target in Offices if GCL = offices count
  let targetRooms = Game.gcl.level <= offices.length ? Object.keys(Memory.offices) : Object.keys(Memory.rooms);

  for (const room of targetRooms) {
    if (!acquireTargetIsValid(room) || shouldPostponeAcquire(room)) {
      delete Memory.rooms[room].acquire;
      continue;
    }

    const distance = Math.min(
      ...offices
        .filter(r => Game.rooms[r].energyCapacityAvailable >= 850)
        .map(r => getOfficeDistanceByRoomPath(r, room) ?? Infinity),
      Infinity
    );
    if (distance * 50 > CREEP_CLAIM_LIFE_TIME) {
      delete Memory.rooms[room].acquire;
      continue;
    }

    if (Memory.rooms[room].acquire) {
      delete Memory.rooms[room].lastAcquireAttempt;
      cachedAcquireTarget = room;
      return room;
    }
    const score = scoreAcquireTarget(room);

    // If no target, pick the first eligible one
    // If the target has a better mineral, pick that one
    // If the target's mineral ranking is the same but it's closer, pick that one
    if (!bestTarget || score < bestScore) {
      bestTarget = room;
      bestScore = score;
    }
  }

  if (bestTarget) {
    Memory.rooms[bestTarget].acquire = true;
    delete Memory.rooms[bestTarget].lastAcquireAttempt;
    cachedAcquireTarget = bestTarget;
  }

  return cachedAcquireTarget;
};

/**
 * If acquire attempt fails, reschedule attempt on a progressive scale
 * 20k ticks after first failure, 40k ticks after second, etc.
 */
const shouldPostponeAcquire = (roomName: string) => {
  // If it's less than five ticks since Lawyer checked in,
  // or Lawyer hasn't checked in yet, ignore
  const timeSinceLastAttempt = Game.time - (Memory.rooms[roomName].lastAcquireAttempt ?? Game.time);
  const attempts = Memory.rooms[roomName].acquireAttempts ?? 0;
  if (timeSinceLastAttempt < 5) {
    return false;
  }
  if (timeSinceLastAttempt > attempts * 20000) {
    return false;
  }
  return true;
};

export const acquireTargetIsValid = (roomName: string) => {
  return (
    Memory.rooms[roomName].eligibleForOffice &&
    (!Memory.rooms[roomName].owner ||
      (Memory.rooms[roomName].owner === 'LordGreywether' && (Game.rooms[roomName]?.controller?.level ?? 0) < 4)) &&
    (!Memory.rooms[roomName].reserver || Memory.rooms[roomName].reserver === 'LordGreywether') &&
    Memory.roomPlans[roomName]?.office
  );
};

export const officeShouldAcquireTarget = (officeName: string) => {
  const room = findAcquireTarget();
  if (!room) return false;

  if (officeName === room || rcl(officeName) < 5) return false;

  const distance = getOfficeDistanceByRoomPath(officeName, room);

  return distance && distance < CREEP_CLAIM_LIFE_TIME;
};

export const officeShouldClaimAcquireTarget = (officeName: string) => {
  // Sets acquireTarget and acquiringOffice. If we sohuld not
  // support, we should not claim either.
  if (!officeShouldAcquireTarget(officeName)) return false;

  // Evaluate further if claiming is actually necessary
  if (!cachedAcquireTarget) return false;
  return !Memory.offices[cachedAcquireTarget];
};

export const officeShouldSupportAcquireTarget = (officeName: string) => {
  // Sets acquireTarget and acquiringOffice. If we sohuld not
  // support, we should not claim either.
  if (!officeShouldAcquireTarget(officeName)) return false;

  // Evaluate further if claiming or support are necessary
  if (!cachedAcquireTarget) return false;
  if (roomPlans(cachedAcquireTarget)?.fastfiller?.spawns[0].structure) return false; // don't bother supporting once we have a spawn
  const controller = Game.rooms[cachedAcquireTarget]?.controller;
  if (!controller) return false;
  return controller.my && controller.level < 4;
};
