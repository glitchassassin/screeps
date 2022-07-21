import { outsidePerimeter } from "Selectors/perimeter";
import { mineralPosition, sourcePositions } from "Selectors/roomCache";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import { memoize, memoizeByTick } from "utils/memoizeFunction";
import { calculateNearbyPositions, isPositionWalkable, isSourceKeeperRoom, terrainCostAt } from "./MapCoordinates";

interface getCostMatrixOptions {
  ignoreSourceKeepers?: boolean,
  avoidCreeps?: boolean,
  ignoreStructures?: boolean,
  stayInsidePerimeter?: boolean,
}
export const getCostMatrix = memoizeByTick(
  (roomName: string, avoidCreeps: boolean = false, opts = {}) => `${roomName} ${avoidCreeps ? 'Y' : 'N'} ${JSON.stringify(opts)}`,
  (roomName: string, avoidCreeps: boolean = false, opts?: getCostMatrixOptions) => {
      let room = Game.rooms[roomName];
      let costs = new PathFinder.CostMatrix;

      if (!opts?.ignoreSourceKeepers && isSourceKeeperRoom(roomName)) {
          // Block out radius of 5 around protected sources
          for (let source of sourcePositions(roomName)) {
              for (let pos of calculateNearbyPositions(source, 5, true)) {
                  costs.set(pos.x, pos.y, 254)
              }
          }
          const mineral = mineralPosition(roomName);
          if (mineral) {
              for (let pos of calculateNearbyPositions(mineral, 5, true)) {
                  costs.set(pos.x, pos.y, 254)
              }
          }
      }

      if (!room) return costs;
      if (!opts?.ignoreStructures) {
          for (let struct of room.find(FIND_STRUCTURES)) {
          if ((OBSTACLE_OBJECT_TYPES as string[]).includes(struct.structureType)) {
              // Can't walk through non-walkable buildings
              costs.set(struct.pos.x, struct.pos.y, 0xff);
          } else if (struct.structureType === STRUCTURE_ROAD && !(costs.get(struct.pos.x, struct.pos.y) === 0xff)) {
              // Favor roads over plain tiles
              costs.set(struct.pos.x, struct.pos.y, 1);
          }
          }

          for (let struct of room.find(FIND_MY_CONSTRUCTION_SITES)) {
              if (struct.structureType !== STRUCTURE_ROAD &&
                  struct.structureType !== STRUCTURE_CONTAINER &&
                  struct.structureType !== STRUCTURE_RAMPART) {
              // Can't walk through non-walkable construction sites
              costs.set(struct.pos.x, struct.pos.y, 0xff);
              }
          }
      }

      // Avoid creeps in the room
      if (avoidCreeps) {
          room.find(FIND_CREEPS).forEach(function(creep) {
              costs.set(creep.pos.x, creep.pos.y, 0xff);
          });
      }

      if (opts?.stayInsidePerimeter) {
          for (const pos of outsidePerimeter(roomName)) {
              costs.set(pos.x, pos.y, 0xff);
          }
      }

      return costs;
  }
)
let costMatrixWithPaths;
export const pathsCostMatrix = memoizeByTick(
  () => 'pathsCostMatrix',
  () => {
      costMatrixWithPaths = new PathFinder.CostMatrix();
      return costMatrixWithPaths;
  }
)
export const blockSquare = (pos: RoomPosition) => pathsCostMatrix().set(pos.x, pos.y, 255);
export const setMove = (pos: RoomPosition, weight = 3) => {
  const cached = pathsCostMatrix();
  if (cached.get(pos.x, pos.y) !== 255) {
      cached.set(
           pos.x,
            pos.y,
          Math.max(0, Math.min(255, (cached.get(pos.x, pos.y) ?? terrainCostAt(pos)) + weight))
      )
  }
}

export const getPath = (from: RoomPosition, to: RoomPosition, range: number, ignoreRoads = false) => {
  let positionsInRange = calculateNearbyPositions(to, range, true)
                                       .filter(pos => isPositionWalkable(pos, true));
  if (positionsInRange.length === 0) return;
  let route = PathFinder.search(from, positionsInRange, {
      roomCallback: (room) => {
          return getCostMatrix(room, false)
      },
      plainCost: ignoreRoads ? 1 : 2,
      swampCost: ignoreRoads ? 5 : 10,
      maxOps: 100000,
  })
  if (!route || route.incomplete) return;

  return route;
}
export const getRangeByPath = (from: RoomPosition, to: RoomPosition, range: number, ignoreRoads = false) => {
  const path = getPath(from, to, range, ignoreRoads);
  return !path || path?.incomplete ? undefined : path.cost;
}

export const getRoomPathDistance = memoize(
  (room1: string, room2: string) => [room1, room2].sort().join(''),
  (room1: string, room2: string) => {
      const newRoute = Game.map.findRoute(room1, room2, {
          routeCallback: (room) => getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0
      });
      if (newRoute === -2) return undefined;
      return newRoute.length;
  }
)
