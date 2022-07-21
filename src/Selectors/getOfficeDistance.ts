import { getPath, getRoomPathDistance } from "./Map/Pathing";
import { roomPlans } from "./roomPlans";

export const getOfficeDistanceByRange = (office1: string, office2: string) => {
  return Game.map.getRoomLinearDistance(office1, office2);
}

const pathCache = new Map<string, PathFinderPath>();
export const getOfficeDistanceByPath = (office1: string, office2: string) => {
  const key = [office1, office2].sort().join('');
  if (!pathCache.has(key)) {
    const pos1 = roomPlans(office1)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office1);
    const pos2 = roomPlans(office2)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office2);
    const path = getPath(pos1, pos2, 1);
    if (path) pathCache.set(key, path);
  }
  return pathCache.get(key)?.cost;
}

const roomPathCache = new Map<string, number>();
export const getOfficeDistanceByRoomPath = (office1: string, office2: string) => {
  const key = [office1, office2].sort().join('');
  if (!roomPathCache.has(key)) {
    const distance = getRoomPathDistance(office1, office2);
    if (distance) roomPathCache.set(key, distance);
  }
  return roomPathCache.get(key);
}
