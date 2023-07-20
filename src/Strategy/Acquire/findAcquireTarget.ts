import { ACQUIRE_MAX_RCL, OFFICE_LIMIT } from 'config';
import { getOfficeDistanceByRoomPath } from '../../Selectors/getOfficeDistance';
import { rcl } from '../../Selectors/rcl';
import { scoreAcquireTarget } from './scoreAcquireTarget';

declare global {
  interface Memory {
    claim?: {
      target: string;
      claimer?: string; // creep name
    };
  }
}

export enum AcquireStatus {
  CLAIM = 'claim',
  SUPPORT = 'support',
  DONE = 'done'
}

/**
 * If GCL <= Memory.offices.length, return
 * If an Acquire target is already saved (and still valid), use that
 * Otherwise, for each office, find the closest room plan that isn't
 * already an office. The closest is the winner.
 */
export const findAcquireTarget = () => {
  if (Memory.claim && acquireTargetIsValid(Memory.claim.target) && !shouldPostponeAcquire(Memory.claim.target)) {
    return Memory.claim.target;
  } else {
    Memory.claim = undefined;
  }

  const shouldAcquire = Object.keys(Memory.offices).length < Math.min(OFFICE_LIMIT, Game.gcl.level);

  // Evaluate a new target every 50 ticks
  if ((Game.time + 25) % 50 !== 0) return undefined;

  // No cached target, scan for an acceptable one
  const offices = Object.keys(Memory.offices);
  let bestTarget: string | undefined;
  let bestScore: number = Infinity;

  // Look for acquire/support target in Offices if GCL = offices count
  let targetRooms = shouldAcquire ? Object.keys(Memory.rooms) : Object.keys(Memory.offices);

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
    Memory.claim = { target: bestTarget };
  }

  return Memory.claim?.target;
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

export const acquireStatus = () => {
  if (!Memory.claim) return AcquireStatus.DONE;
  if (!Game.rooms[Memory.claim.target]?.controller?.my) return AcquireStatus.CLAIM;
  if (rcl(Memory.claim.target) < ACQUIRE_MAX_RCL) return AcquireStatus.SUPPORT;
  return AcquireStatus.DONE;
};

export const officeShouldAcquireTarget = (officeName: string) => {
  const room = findAcquireTarget();
  if (!room) return false;

  if (officeName === room || rcl(officeName) < 5) return false;

  const distance = getOfficeDistanceByRoomPath(officeName, room);

  return distance && distance < CREEP_CLAIM_LIFE_TIME / 50;
};

export const officeShouldClaimAcquireTarget = (officeName: string) => {
  // Sets acquireTarget and acquiringOffice. If we sohuld not
  // support, we should not claim either.
  if (!officeShouldAcquireTarget(officeName)) return false;

  return acquireStatus() === AcquireStatus.CLAIM;
};

export const officeShouldSupportAcquireTarget = (officeName: string) => {
  // Sets acquireTarget and acquiringOffice. If we sohuld not
  // support, we should not claim either.
  if (!officeShouldAcquireTarget(officeName)) return false;

  return acquireStatus() === AcquireStatus.SUPPORT;
};
