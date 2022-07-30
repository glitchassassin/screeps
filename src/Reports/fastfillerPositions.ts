import { roomPlans } from 'Selectors/roomPlans';

export function fastfillerPositions(room: string) {
  const spawns = roomPlans(room)?.fastfiller?.spawns;
  if (!spawns) return [];
  const [spawn1, spawn2, spawn3] = spawns.map(s => s.pos);
  return [
    new RoomPosition(spawn1.x + 1, spawn1.y, spawn1.roomName),
    new RoomPosition(spawn3.x - 1, spawn3.y - 1, spawn3.roomName),
    new RoomPosition(spawn2.x - 1, spawn2.y, spawn2.roomName),
    new RoomPosition(spawn3.x + 1, spawn3.y - 1, spawn3.roomName)
  ];
}
