import { roomPlans } from "./roomPlans";

let cachedAcquireTarget: string|undefined;
let cachedAcquiringOffice: string|undefined;

declare global {
    interface RoomMemory {
        acquire?: boolean
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

    if (cachedAcquireTarget && acquireTargetIsValid(cachedAcquireTarget)) {
        return cachedAcquireTarget;
    } else {
        cachedAcquireTarget = undefined;
        cachedAcquiringOffice = undefined;
    }

    // No cached target, scan for an acceptable one
    let bestTarget: string|undefined;
    let bestTargetDistance: number = Infinity;

    // Look for acquire/support target in Offices if GCL = offices count
    let targetRooms = (Game.gcl.level <= offices.length) ?
        Object.keys(Memory.offices) :
        Object.keys(Memory.rooms)

    for (const room of targetRooms) {
        if (!acquireTargetIsValid(room)) {
            delete Memory.rooms[room].acquire;
            continue;
        }

        if (Memory.rooms[room].acquire) {
            cachedAcquireTarget = room;
            cachedAcquiringOffice = undefined;
            return room;
        }

        const distance = Math.min(...offices.filter(r => Game.rooms[r].energyCapacityAvailable >= 850).map(r => Game.map.getRoomLinearDistance(r, room)), Infinity)

        if (!bestTarget || distance < bestTargetDistance) {
            bestTarget = room;
            bestTargetDistance = distance;
        }
    }

    if (bestTarget && bestTargetDistance <= 10) {
        Memory.rooms[bestTarget].acquire = true;
        cachedAcquireTarget = bestTarget;
        cachedAcquiringOffice = undefined;
    }

    return cachedAcquireTarget;
}

export const acquireTargetIsValid = (roomName: string) => {
    return (
        (
            !Memory.rooms[roomName].owner ||
            (
                Memory.rooms[roomName].owner === 'LordGreywether' &&
                (Game.rooms[roomName]?.controller?.level ?? 0) < 4
            )
        ) &&
        (
            !Memory.rooms[roomName].reserver ||
            Memory.rooms[roomName].reserver === 'LordGreywether'
        ) &&
        roomPlans(roomName)?.office
    )
}

export const officeShouldClaimAcquireTarget = (officeName: string) => {
    // Sets acquireTarget and acquiringOffice. If we sohuld not
    // support, we should not claim either.
    if (!officeShouldSupportAcquireTarget(officeName)) return false;

    // Evaluate further if claiming is actually necessary
    if (!cachedAcquireTarget) return false;
    return !Memory.offices[cachedAcquireTarget]
}

export const officeShouldSupportAcquireTarget = (officeName: string) => {
    const room = findAcquireTarget();
    if (!room) return false;

    if (cachedAcquiringOffice) return (officeName === cachedAcquiringOffice);

    let bestTarget: string|undefined;
    let bestTargetDistance: number = Infinity;
    for (const o in Memory.offices) {
        if (Game.rooms[o].energyCapacityAvailable < 850) continue;

        const distance = Game.map.getRoomLinearDistance(o, room)

        if (!bestTarget || distance < bestTargetDistance) {
            bestTarget = o;
            bestTargetDistance = distance;
        }
    }

    if (bestTargetDistance <= 10) {
        cachedAcquiringOffice = bestTarget
    }

    return (officeName === cachedAcquiringOffice);
}
