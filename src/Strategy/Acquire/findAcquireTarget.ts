import { OFFICE_LIMIT } from 'config';
import { getOfficeDistanceByRoomPath } from '../../Selectors/getOfficeDistance';
import { rcl } from '../../Selectors/rcl';
import { scoreAcquireTarget } from './scoreAcquireTarget';

declare global {
  interface Memory {
    acquireTarget?: string;
  }
}

/**
 * If GCL <= Memory.offices.length, return
 * If an Acquire target is already saved (and still valid), use that
 * Otherwise, for each office, find the closest room plan that isn't
 * already an office. The closest is the winner.
 */
export const findAcquireTarget = () => {
  const offices = Object.keys(Memory.offices);

  if (offices.length >= OFFICE_LIMIT || Game.cpu.limit / offices.length <= 5) return undefined; // Don't spread ourselves out too thin

  if (
    Memory.acquireTarget &&
    acquireTargetIsValid(Memory.acquireTarget) &&
    !shouldPostponeAcquire(Memory.acquireTarget)
  ) {
    return Memory.acquireTarget;
  } else {
    Memory.acquireTarget = undefined;
  }

  // Evaluate a new target every 50 ticks
  if ((Game.time + 25) % 50 !== 0) return undefined;

  // No cached target, scan for an acceptable one
  let bestTarget: string | undefined;
  let bestScore: number = Infinity;

  // Look for acquire/support target in Offices if GCL = offices count
  let targetRooms = Game.gcl.level <= offices.length ? Object.keys(Memory.offices) : Object.keys(Memory.rooms);

  for (const room of targetRooms) {
    if (!acquireTargetIsValid(room) || shouldPostponeAcquire(room)) {
      continue;
    }

    const distance = Math.min(
      ...offices
        .filter(r => Game.rooms[r].energyCapacityAvailable >= 850)
        .map(r => getOfficeDistanceByRoomPath(r, room) ?? Infinity),
      Infinity
    );
    if (distance * 50 > CREEP_CLAIM_LIFE_TIME) {
      continue;
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
    delete Memory.rooms[bestTarget].lastAcquireAttempt;
    Memory.acquireTarget = bestTarget;
  }

  return Memory.acquireTarget;
};

/**
 * If acquire attempt fails, reschedule attempt on a progressive scale
 * 20k ticks after first failure, 40k ticks after second, etc.
 */
const shouldPostponeAcquire = (roomName: string) => {
  if (Game.rooms[roomName]?.controller?.my) return false; // already claimed
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
    Memory.rooms[roomName] &&
    Memory.rooms[roomName].eligibleForOffice &&
    (!Memory.rooms[roomName].owner ||
      (Memory.rooms[roomName].owner === 'LordGreywether' && (Game.rooms[roomName]?.controller?.level ?? 0) < 4)) &&
    (!Memory.rooms[roomName].reserver || Memory.rooms[roomName].reserver === 'LordGreywether') &&
    Memory.roomPlans[roomName]?.office &&
    (Memory.rooms[roomName].owner === 'LordGreywether' || (Memory.rooms[roomName].safeModeCooldown ?? 0) < Game.time)
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
  if (!Memory.acquireTarget) return false;
  return !Memory.offices[Memory.acquireTarget];
};

export const officeShouldSupportAcquireTarget = (officeName: string) => {
  // Sets acquireTarget and acquiringOffice. If we sohuld not
  // support, we should not claim either.
  if (!officeShouldAcquireTarget(officeName)) return false;

  // Evaluate further if claiming or support are necessary
  if (!Memory.acquireTarget) return false;
  // if (roomPlans(Memory.acquireTarget)?.fastfiller?.spawns[0].structure) return false; // don't bother supporting once we have a spawn
  const controller = Game.rooms[Memory.acquireTarget]?.controller;
  if (!controller) return false;
  return controller.my && controller.level < 4;
};
