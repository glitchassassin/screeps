import { memoize } from 'utils/memoizeFunction';
import { posById } from './posById';

export const sourceIds = (roomName: string) =>
  Memory.rooms[roomName]?.sourceIds?.filter(s => s) ?? ([] as Id<Source>[]);
export const sourcePositions = (roomName: string) =>
  sourceIds(roomName)
    .map(id => posById(id))
    .filter(s => s) as RoomPosition[];

export const mineralId = (roomName: string) => Memory.rooms[roomName]?.mineralId as Id<Mineral> | undefined;
export const mineralPosition = (roomName: string) => posById(mineralId(roomName));

export const controllerId = (roomName: string) =>
  Memory.rooms[roomName]?.controllerId as Id<StructureController> | undefined;
export const controllerPosition = (roomName: string) => posById(controllerId(roomName));

export const roomExits = memoize(
  roomName => roomName,
  (roomName: string) => {
    const exits = [];
    for (let x = 0; x < 50; x += 1) {
      exits.push(new RoomPosition(x, 0, roomName));
      exits.push(new RoomPosition(x, 49, roomName));
    }
    for (let y = 1; y < 49; y += 1) {
      exits.push(new RoomPosition(0, y, roomName));
      exits.push(new RoomPosition(49, y, roomName));
    }
    const terrain = Game.map.getRoomTerrain(roomName);
    return exits.filter(pos => terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL); // any border squares that aren't walls must be exits
  }
);
