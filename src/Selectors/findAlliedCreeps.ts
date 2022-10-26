import { WHITELIST } from 'config';

export const findAlliedCreeps = (room: string) => {
  if (!Game.rooms[room]) return [];

  // Return hostile creeps, if they are whitelisted
  return Game.rooms[room].find(FIND_HOSTILE_CREEPS, { filter: creep => WHITELIST.includes(creep.owner.username) });
};

export const findAlliedCreepsInRange = (pos: RoomPosition, range: number) => {
  if (!Game.rooms[pos.roomName]) return [];

  // Return hostile creeps, if they are whitelisted
  return pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: creep => WHITELIST.includes(creep.owner.username) });
};

export const findClosestAlliedCreepByRange = (pos: RoomPosition) => {
  if (!Game.rooms[pos.roomName]) return;
  return pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: creep => WHITELIST.includes(creep.owner.username) });
};
