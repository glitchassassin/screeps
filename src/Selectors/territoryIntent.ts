import { controllerId, sourceIds } from './roomCache';

export enum TerritoryIntent {
  AVOID = 'AVOID',
  ACQUIRE = 'ACQUIRE',
  DEFEND = 'DEFEND',
  EXPLOIT = 'EXPLOIT',
  IGNORE = 'IGNORE',
  PLUNDER = 'PLUNDER'
}

export const getTerritoryIntent = (roomName: string) => {
  let controller = controllerId(roomName);
  let sources = sourceIds(roomName);
  const hostiles = Game.time - (Memory.rooms[roomName]?.lastHostileSeen ?? 0) <= 10;

  if (!controller) {
    return TerritoryIntent.IGNORE;
  }

  if (Memory.rooms[roomName]?.plunder?.resources.length) {
    return TerritoryIntent.PLUNDER;
  }

  if (
    Memory.rooms[roomName]?.owner &&
    !Game.rooms[roomName]?.controller?.my
    // (Memory.rooms[roomName]?.reserver && Memory.rooms[roomName]?.reserver !== 'LordGreywether' && Memory.rooms[roomName]?.reserver !== 'Invader')
  ) {
    return TerritoryIntent.AVOID;
  } else if (hostiles && Memory.offices[roomName]) {
    // Owned Office has hostiles present, recently
    return TerritoryIntent.DEFEND;
  } else if (sources.length > 0) {
    return TerritoryIntent.EXPLOIT;
  } else {
    return TerritoryIntent.IGNORE;
  }
};
