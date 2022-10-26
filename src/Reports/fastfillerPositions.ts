import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';
import { packPos } from 'utils/packrat';

export function fastfillerPositions(room: string, effectiveRcl = rcl(room)) {
  const spawns = roomPlans(room)?.fastfiller?.spawns;
  if (!spawns) return [];
  const [spawn1, spawn2, spawn3] = spawns.map(s => s.pos);
  return [
    new RoomPosition(spawn1.x + 1, spawn1.y, spawn1.roomName),
    new RoomPosition(spawn3.x - 1, spawn3.y - 1, spawn3.roomName),
    new RoomPosition(spawn2.x - 1, spawn2.y, spawn2.roomName),
    new RoomPosition(spawn3.x + 1, spawn3.y - 1, spawn3.roomName)
  ].slice(0, effectiveRcl < 3 ? 2 : undefined); // only fill the first two fastiller positions until RCL3
}

export function refillSquares(room: string) {
  const [topLeft, bottomLeft, topRight, bottomRight] = fastfillerPositions(room, 8).map(p => packPos(p));
  return {
    topLeft,
    bottomLeft,
    topRight,
    bottomRight
  };
}
