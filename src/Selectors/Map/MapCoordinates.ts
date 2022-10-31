import { cachePath, getCachedPath } from 'screeps-cartographer';
import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';
import { memoize, memoizeByTick } from 'utils/memoizeFunction';

export const calculateAdjacencyMatrix = memoize(
  (proximity: number) => '' + proximity,
  (proximity = 1): { x: number; y: number }[] => {
    let adjacencies = new Array(proximity * 2 + 1).fill(0).map((v, i) => i - proximity);

    return adjacencies
      .flatMap(x => adjacencies.map(y => ({ x, y })))
      .filter((a: { x: number; y: number }) => !(a.x === 0 && a.y === 0));
  }
);
export const calculateAdjacentPositions = memoize(
  (pos: RoomPosition) => pos.toString(),
  (pos: RoomPosition) => {
    return calculateNearbyPositions(pos, 1);
  }
);

export const adjacentWalkablePositions = (pos: RoomPosition, ignoreCreeps = false) =>
  calculateAdjacentPositions(pos).filter(p => isPositionWalkable(p, ignoreCreeps));

export const calculateNearbyPositions = memoize(
  (pos: RoomPosition, proximity: number, includeCenter = false) => `${pos}x${proximity} ${includeCenter}`,
  (pos: RoomPosition, proximity: number, includeCenter = false) => {
    let adjacent: RoomPosition[] = [];
    adjacent = calculateAdjacencyMatrix(proximity)
      .map(offset => {
        try {
          return new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName);
        } catch {
          return null;
        }
      })
      .filter(roomPos => roomPos !== null) as RoomPosition[];
    if (includeCenter) adjacent.push(pos);
    return adjacent;
  }
);
export const calculateNearbyRooms = memoize(
  (roomName: string, proximity: number, includeCenter = false) => `${roomName} ${proximity} ${includeCenter}`,
  (roomName: string, proximity: number, includeCenter = false) => {
    let { wx, wy } = roomNameToCoords(roomName);
    let roomStatus = Game.map.getRoomStatus(roomName);
    let adjacent = calculateAdjacencyMatrix(proximity)
      .map(offset => {
        try {
          return roomNameFromCoords(wx + offset.x, wy + offset.y);
        } catch {
          return null;
        }
      })
      .filter(n => {
        if (n === null) return false;
        try {
          let status = Game.map.getRoomStatus(n);
          if (roomStatus.status === status.status || status.status === 'normal') {
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }) as string[];
    if (includeCenter) adjacent.push(roomName);
    return adjacent;
  }
);
export const isPositionWalkable = memoizeByTick(
  (pos: RoomPosition, ignoreCreeps: boolean = false, ignoreStructures: boolean = false) =>
    pos.toString() + ignoreCreeps + ignoreStructures,
  (pos: RoomPosition, ignoreCreeps: boolean = false, ignoreStructures: boolean = false) => {
    let terrain;
    try {
      terrain = Game.map.getRoomTerrain(pos.roomName);
    } catch {
      // Invalid room
      return false;
    }
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
      return false;
    }
    if (
      Game.rooms[pos.roomName] &&
      pos.look().some(obj => {
        if (!ignoreCreeps && obj.type === LOOK_CREEPS) return true;
        if (
          !ignoreStructures &&
          obj.constructionSite &&
          (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.constructionSite.structureType)
        )
          return true;
        if (
          !ignoreStructures &&
          obj.structure &&
          (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.structure.structureType)
        )
          return true;
        return false;
      })
    ) {
      return false;
    }
    return true;
  }
);

export const getRangeTo = memoize(
  (from: RoomPosition, to: RoomPosition) => `${from} ${to}`,
  (from: RoomPosition, to: RoomPosition) => {
    if (from.roomName === to.roomName) return from.getRangeTo(to);

    // Calculate global positions
    let fromGlobal = globalPosition(from);
    let toGlobal = globalPosition(to);

    return Math.max(Math.abs(fromGlobal.x - toGlobal.x), Math.abs(fromGlobal.y - toGlobal.y));
  }
);
export const getClosestByRange = <T extends _HasRoomPosition>(from: RoomPosition, targets: T[]) => {
  let closest: T | undefined;
  let closestRange = Infinity;
  for (const target of targets) {
    const range = getRangeTo(from, target.pos);
    if (range < closestRange) {
      closest = target;
      closestRange = range;
    }
  }
  return closest;
};
export const globalPosition = (pos: RoomPosition) => {
  let { x, y, roomName } = pos;
  if (!_.inRange(x, 0, 50)) throw new RangeError('x value ' + x + ' not in range');
  if (!_.inRange(y, 0, 50)) throw new RangeError('y value ' + y + ' not in range');
  if (roomName == 'sim') throw new RangeError('Sim room does not have world position');
  let { wx, wy } = roomNameToCoords(roomName);
  return {
    x: 50 * Number(wx) + x,
    y: 50 * Number(wy) + y
  };
};
export const isHighway = (roomName: string) => {
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
};
export const isSourceKeeperRoom = (roomName: string) => {
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  let fmod = Number(parsed[1]) % 10;
  let smod = Number(parsed[2]) % 10;
  // return !(fmod === 5 && smod === 5) && (fmod >= 4 && fmod <= 6) && (smod >= 4 && smod <= 6);
  return fmod >= 4 && fmod <= 6 && smod >= 4 && smod <= 6;
};
export const roomNameToCoords = (roomName: string) => {
  let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
  if (!match) throw new Error('Invalid room name');
  let [, h, wx, v, wy] = match;
  return {
    wx: h == 'W' ? ~Number(wx) : Number(wx),
    wy: v == 'S' ? ~Number(wy) : Number(wy)
  };
};
export const roomNameFromCoords = (x: number, y: number) => {
  let h = x < 0 ? 'W' : 'E';
  let v = y < 0 ? 'S' : 'N';
  x = x < 0 ? ~x : x;
  y = y < 0 ? ~y : y;
  return `${h}${x}${v}${y}`;
};
export const countTerrainTypes = (roomName: string) => {
  let terrain = Game.map.getRoomTerrain(roomName);
  const terrainStats = { swamp: 0, plains: 0, wall: 0, lava: 0 };
  for (let x = 0; x < 50; x += 1) {
    for (let y = 0; y < 50; y += 1) {
      const t = terrain.get(x, y);
      if (t & TERRAIN_MASK_SWAMP) {
        terrainStats.swamp += 1;
      } else if (t & TERRAIN_MASK_WALL) {
        terrainStats.wall += 1;
      } else if (t & TERRAIN_MASK_LAVA) {
        terrainStats.lava += 1;
      } else {
        terrainStats.plains += 1;
      }
    }
  }
  return terrainStats;
};
export const sortByDistanceTo = <T extends RoomPosition | _HasRoomPosition>(pos: RoomPosition) => {
  let distance = new Map<RoomPosition, number>();
  return (a: T, b: T) => {
    let aPos = a instanceof RoomPosition ? a : (a as _HasRoomPosition).pos;
    let bPos = b instanceof RoomPosition ? b : (b as _HasRoomPosition).pos;
    if (!distance.has(aPos)) {
      distance.set(aPos, getRangeTo(pos, aPos));
    }
    if (!distance.has(bPos)) distance.set(bPos, getRangeTo(pos, bPos));
    return (distance.get(aPos) as number) - (distance.get(bPos) as number);
  };
};
export const sortByDistanceToRoom = <T extends { name: string } | string>(roomName: string) => {
  let distance = new Map<string, number>();
  let target = roomNameToCoords(roomName);
  return (a: T, b: T) => {
    let aName = typeof a === 'string' ? a : (a as { name: string }).name;
    let bName = typeof b === 'string' ? b : (b as { name: string }).name;
    let aCoords = roomNameToCoords(aName);
    let bCoords = roomNameToCoords(bName);
    if (!distance.has(aName)) {
      distance.set(aName, Math.max(Math.abs(target.wx - aCoords.wx), Math.abs(target.wy - aCoords.wy)));
    }
    if (!distance.has(bName))
      distance.set(bName, Math.max(Math.abs(target.wx - bCoords.wx), Math.abs(target.wy - bCoords.wy)));
    return (distance.get(aName) as number) - (distance.get(bName) as number);
  };
};
export function lookNear(pos: RoomPosition, range = 1) {
  return Game.rooms[pos.roomName].lookAtArea(
    Math.max(1, Math.min(49, pos.y - range)),
    Math.max(1, Math.min(49, pos.x - range)),
    Math.max(1, Math.min(49, pos.y + range)),
    Math.max(1, Math.min(49, pos.x + range)),
    true
  );
}
export const getClosestOffice = memoize(
  (roomName: string, minRcl = 1) => roomName + minRcl + Object.keys(Memory.offices).join(''),
  (roomName: string, minRcl = 1) => {
    let closest: string | undefined = undefined;
    let route: { exit: ExitConstant; room: string }[] | undefined = undefined;
    for (let office of Object.keys(Memory.offices)) {
      if (rcl(office) < minRcl) continue;
      const newRoute = Game.map.findRoute(office, roomName);
      if (newRoute === -2) continue;
      if (!closest || newRoute.length < (route?.length ?? Infinity)) {
        closest = office;
        route = newRoute;
      }
    }
    return closest;
  }
);
export const getClosestOfficeFromMemory = (roomName: string) => {
  let closest: string | undefined = undefined;
  let length = Infinity;
  for (let office in Memory.rooms[roomName].franchises) {
    const path = cachePath(
      office + roomName,
      roomPlans(office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office),
      { pos: new RoomPosition(25, 25, roomName), range: 20 }
    );

    if (!path) continue;
    if (path.length < length) {
      length = path.length;
      closest = office;
    }
  }
  return closest;
};
export const getOfficeDistanceFromMemory = (roomName: string) => {
  let closest: string | undefined = undefined;
  let length = Infinity;
  for (let office in Memory.rooms[roomName].franchises) {
    for (let franchise of Object.keys(Memory.rooms[roomName].franchises[office])) {
      const path = getCachedPath(office + franchise);
      if (!path) continue;
      if (path.length < length) {
        length = path.length;
        closest = office;
      }
    }
  }
  return closest;
};

export const terrainCostAt = (pos: RoomPosition) => {
  const terrain = Game.map.getRoomTerrain(pos.roomName).get(pos.x, pos.y);
  if (terrain === TERRAIN_MASK_SWAMP) return 5;
  if (terrain === TERRAIN_MASK_WALL) return 255;
  return 1;
};
export function terrainCosts(creep: Creep) {
  const ignoreCarryParts = creep.store.getUsedCapacity() === 0;
  const moveParts = creep.getActiveBodyparts(MOVE);
  const bodyLength = creep.body.filter(p => p.type !== MOVE && (!ignoreCarryParts || p.type !== CARRY)).length;
  const efficiency = 1 / (moveParts / bodyLength);
  const ignoreRoads = efficiency <= 0.5;
  const plainsBase = ignoreRoads ? 1 : 2;
  const swampBase = ignoreRoads ? 5 : 10;
  const costs = {
    plainCost: Math.max(1, Math.min(plainsBase, Math.ceil(plainsBase * efficiency))),
    swampCost: Math.max(1, Math.min(swampBase, Math.ceil(swampBase * efficiency)))
  };
  return costs;
}
export function forEverySquareInRoom(callback: (x: number, y: number) => void) {
  for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
      callback(x, y);
    }
  }
}

export function posAtDirection(origin: RoomPosition, direction: DirectionConstant) {
  const offset = [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 }
  ][direction - 1];
  return new RoomPosition(origin.x + offset.x, origin.y + offset.y, origin.roomName);
}
