import { distanceTransform } from 'RoomPlanner/Algorithms/distancetransform';
import { forEverySquareInRoom } from 'Selectors/Map/MapCoordinates';
import { Coord } from 'utils/packrat';
import { Stamp } from './stamps';

export function fitStamp(room: string, stamp: Stamp, costMatrix?: CostMatrix) {
  const dt = distanceTransform(room, false, costMatrix);
  const squares: Coord[] = [];
  const offset = Math.floor(stamp.length / 2);
  forEverySquareInRoom((x, y) => {
    if (dt.get(x, y) > offset) {
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
