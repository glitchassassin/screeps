import { diamondDistanceTransform, distanceTransform } from 'RoomPlanner/Algorithms/distancetransform';
import { forEverySquareInRoom } from 'Selectors/Map/MapCoordinates';
import { Coord } from 'utils/packrat';
import { Stamp } from './stamps';

export function fitStamp(room: string, stamp: Stamp, costMatrix?: CostMatrix, diamond = false) {
  // pin stamp if initial spawn
  if (stamp.some(s => s.includes(STRUCTURE_SPAWN))) {
    const initialSpawn = Game.rooms[room]?.find(FIND_MY_SPAWNS)[0];
    if (initialSpawn) {
      for (let y = 0; y < stamp.length; y++) {
        for (let x = 0; x < stamp[y].length; x++) {
          if (stamp[y][x] === STRUCTURE_SPAWN) {
            return [{ x: initialSpawn.pos.x - x, y: initialSpawn.pos.y - y }];
          }
        }
      }
    }
  }

  const minMargin = 3; // do not put stamps closer than 3 squares to the edge of the room
  const dt = (diamond ? diamondDistanceTransform : distanceTransform)(room, false, costMatrix);
  const squares: Coord[] = [];
  const offset = Math.floor(stamp.length / 2);
  forEverySquareInRoom((x, y) => {
    const topLeft = { x: x - offset, y: y - offset };
    const bottomRight = { x: x + offset, y: y + offset };
    if (
      topLeft.x <= minMargin ||
      topLeft.y <= minMargin ||
      bottomRight.x + minMargin >= 50 ||
      bottomRight.y + minMargin >= 50
    )
      return;

    if (x > offset && y > offset && x + offset < 50 && y + offset < 50 && dt.get(x, y) > offset) {
      squares.push({ x: x - offset, y: y - offset });
    }
  });
  return squares;
}

export function applyStamp(stamp: Stamp, topLeft: Coord, costMatrix: CostMatrix) {
  const cm = costMatrix.clone();
  stamp.forEach((row, y) => {
    row.forEach((cell, x) => {
      cm.set(
        topLeft.x + x,
        topLeft.y + y,
        Math.max(cell === undefined || cell === STRUCTURE_ROAD ? 0 : 255, cm.get(topLeft.x + x, topLeft.y + y))
      );
    });
  });
  return cm;
}
