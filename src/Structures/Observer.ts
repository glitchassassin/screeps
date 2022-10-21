import { calculateNearbyRooms, isHighway, roomNameToCoords } from 'Selectors/Map/MapCoordinates';
import { roomPlans } from 'Selectors/roomPlans';

const DEBUG = true;

export const runObserver = () => {
  for (const office in Memory.offices) {
    const observer = roomPlans(office)?.backfill?.observer.structure as StructureObserver | undefined;
    if (!observer) continue;
    const observerTargets = calculateNearbyRooms(office, 10, false).filter(r => isHighway(r));
    if (!observerTargets.length) continue;
    const bestTarget = observerTargets.reduce((best, current) => {
      if (!Memory.rooms[best]?.scanned) return best;
      if (!Memory.rooms[current]?.scanned) return current;
      if (Memory.rooms[best].scanned! > Memory.rooms[current].scanned!) return current;
      return best;
    });

    if (DEBUG) visualize(observer.pos, bestTarget);
    observer.observeRoom(bestTarget);
  }
};

const visualize = (origin: RoomPosition, target: string) => {
  const targetCoords = roomNameToCoords(target);
  const originCoords = roomNameToCoords(origin.roomName);
  let corner1, corner2;
  if (targetCoords.wx > originCoords.wx) {
    if (targetCoords.wy < originCoords.wy) {
      corner1 = new RoomPosition(0, 49, target);
      corner2 = new RoomPosition(49, 0, target);
    } else if (targetCoords.wy > originCoords.wy) {
      corner1 = new RoomPosition(0, 0, target);
      corner2 = new RoomPosition(49, 49, target);
    } else {
      corner1 = new RoomPosition(49, 0, target);
      corner2 = new RoomPosition(49, 49, target);
    }
  } else if (targetCoords.wx < originCoords.wx) {
    if (targetCoords.wy < originCoords.wy) {
      corner1 = new RoomPosition(0, 0, target);
      corner2 = new RoomPosition(49, 49, target);
    } else if (targetCoords.wy > originCoords.wy) {
      corner1 = new RoomPosition(0, 49, target);
      corner2 = new RoomPosition(49, 0, target);
    } else {
      corner1 = new RoomPosition(0, 0, target);
      corner2 = new RoomPosition(0, 49, target);
    }
  } else {
    if (targetCoords.wy < originCoords.wy) {
      corner1 = new RoomPosition(0, 49, target);
      corner2 = new RoomPosition(49, 49, target);
    } else {
      corner1 = new RoomPosition(0, 0, target);
      corner2 = new RoomPosition(49, 0, target);
    }
  }

  Game.map.visual.rect(new RoomPosition(0, 0, target), 50, 50, { stroke: '#ffffff', fill: 'transparent' });
  Game.map.visual.poly([corner1, origin, corner2], { stroke: '#ffffff', fill: 'transparent' });
};
