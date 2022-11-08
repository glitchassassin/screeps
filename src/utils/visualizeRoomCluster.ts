import { memoize } from './memoizeFunction';

export const visualizeRoomCluster = (rooms: string[], opts?: LineStyle) => {
  // construct border
  bordersFromRooms(rooms).forEach(([pos1, pos2]) => Game.map.visual.line(pos1, pos2, opts));
};

const bordersFromRooms = memoize(
  (rooms: string[]) => rooms.join(),
  (rooms: string[]) => {
    const borders: [RoomPosition, RoomPosition][] = [];

    const boundaries = rooms.slice();
    while (boundaries.length) {
      const room = boundaries.shift()!;

      const exits = Game.map.describeExits(room);
      if (!rooms.includes(exits[LEFT]!)) {
        borders.push([new RoomPosition(0, 0, room), new RoomPosition(0, 49, room)]);
      }
      if (!rooms.includes(exits[RIGHT]!)) {
        borders.push([new RoomPosition(49, 0, room), new RoomPosition(49, 49, room)]);
      }
      if (!rooms.includes(exits[TOP]!)) {
        borders.push([new RoomPosition(0, 0, room), new RoomPosition(49, 0, room)]);
      }
      if (!rooms.includes(exits[BOTTOM]!)) {
        borders.push([new RoomPosition(0, 49, room), new RoomPosition(49, 49, room)]);
      }
    }
    return borders;
  }
);
