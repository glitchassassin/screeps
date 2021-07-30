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
    if (Game.gcl.level <= offices.length) return;

    if (cachedAcquireTarget && acquireTargetIsValid(cachedAcquireTarget)) {
        return cachedAcquireTarget;
    } else {
        cachedAcquireTarget = undefined;
        cachedAcquiringOffice = undefined;
    }

    // No cached target, scan for an acceptable one
    let bestTarget: string|undefined;
    let bestTargetDistance: number = Infinity;
    for (const room in Memory.rooms) {
        if (!acquireTargetIsValid(room)) {
            delete Memory.rooms[room].acquire;
            continue;
        }

        if (Memory.rooms[room].acquire) {
            cachedAcquireTarget = room;
            cachedAcquiringOffice = undefined;
            return room;
        }

        const distance = Math.min(...offices.filter(r => Game.rooms[r].energyCapacityAvailable >= 850).map(r => Game.map.getRoomLinearDistance(r, room)))

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
        !Memory.rooms[roomName].owner &&
        !Memory.rooms[roomName].reserver &&
        roomPlans(roomName)?.office
    )
}

export const officeShouldAcquireTarget = (officeName: string) => {
    const room = findAcquireTarget();
    if (!room) return false;

    if (cachedAcquiringOffice) return cachedAcquiringOffice;

    let bestTarget: string|undefined;
    let bestTargetDistance: number = Infinity;
    for (const o in Memory.offices) {
        if (Game.rooms[o].energyCapacityAvailable < 850) continue;

        const distance = Game.map.getRoomLinearDistance(o, room)

        if (!bestTarget || distance < bestTargetDistance) {
            bestTarget = room;
            bestTargetDistance = distance;
        }
    }

    if (bestTargetDistance <= 10) {
        cachedAcquiringOffice = bestTarget
    }

    return (officeName === cachedAcquiringOffice);
}
