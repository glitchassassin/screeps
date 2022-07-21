import { WHITELIST } from "config";

export const findHostileCreeps = (room: string) => {
    if (!Game.rooms[room]) return [];

    // Return hostile creeps, if they aren't whitelisted
    return Game.rooms[room].find(
        FIND_HOSTILE_CREEPS,
        {filter: creep => !WHITELIST.includes(creep.owner.username)}
    )
}

export const findInvaderStructures = (room: string) => {
    if (!Game.rooms[room]) return [];

    // Return hostile creeps, if they aren't whitelisted
    return Game.rooms[room].find(
        FIND_HOSTILE_STRUCTURES,
        {filter: structure => structure.structureType === STRUCTURE_INVADER_CORE}
    ) as StructureInvaderCore[]
}

export const findHostileCreepsInRange = (pos: RoomPosition, range: number) => {
    if (!Game.rooms[pos.roomName]) return [];

    // Return hostile creeps, if they aren't whitelisted
    return pos.findInRange(
        FIND_HOSTILE_CREEPS,
        range,
        {filter: creep => !WHITELIST.includes(creep.owner.username)}
    )
}

export const findClosestHostileCreepByRange = (pos: RoomPosition) => {
    if (!Game.rooms[pos.roomName]) return;
    return pos.findClosestByRange(
        FIND_HOSTILE_CREEPS,
        {filter: creep => !WHITELIST.includes(creep.owner.username)}
    )
}
