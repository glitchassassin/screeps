import { fastfillerPositions } from 'Reports/fastfillerPositions';
import { config } from 'screeps-cartographer';
import { ThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { franchiseActive } from 'Selectors/Franchises/franchiseActive';
import { getHeadquarterLogisticsLocation } from 'Selectors/getHqLocations';
import { outsidePerimeter } from 'Selectors/perimeter';
import { plannedOfficeStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { posById } from 'Selectors/posById';
import { rcl } from 'Selectors/rcl';
import { mineralPosition, sourceIds, sourcePositions } from 'Selectors/roomCache';
import { getTerritoryIntent, TerritoryIntent } from 'Selectors/territoryIntent';
import { memoize, memoizeByTick } from 'utils/memoizeFunction';
import {
  adjacentWalkablePositions,
  calculateNearbyPositions,
  isPositionWalkable,
  isSourceKeeperRoom,
  posAtDirection,
  terrainCostAt
} from './MapCoordinates';

interface RouteCallbackOpts {
  ignoreSourceKeeperRooms: boolean;
}

export const defaultRouteCallback = (opts?: RouteCallbackOpts) => (room: string) => {
  if (Memory.rooms[room]?.threatLevel?.[0] === ThreatLevel.OWNED) return Infinity; // avoid owned rooms
  if (!opts?.ignoreSourceKeeperRooms && isSourceKeeperRoom(room)) return Infinity; // avoid source keeper rooms
  return;
};

export const defaultRoomCallback = (opts?: getCostMatrixOptions) => (room: string) => {
  return getCostMatrix(room, false, opts);
};

config.DEFAULT_MOVE_OPTS.routeCallback = defaultRouteCallback();
config.DEFAULT_MOVE_OPTS.roomCallback = defaultRoomCallback();

interface getCostMatrixOptions {
  ignoreSourceKeepers?: boolean;
  avoidCreeps?: boolean;
  ignoreStructures?: boolean;
  stayInsidePerimeter?: boolean;
  terrain?: boolean;
  territoryPlannedRoadsCost?: number;
  roomPlan?: boolean;
  roomPlanAllStructures?: boolean;
  ignoreFastfiller?: boolean;
  ignoreHQLogistics?: boolean;
  ignoreFranchises?: boolean;
}
export const getCostMatrix = memoizeByTick(
  (roomName: string, avoidCreeps: boolean = false, opts = {}) =>
    `${roomName} ${avoidCreeps ? 'Y' : 'N'} ${JSON.stringify(opts)} ${
      opts.roomPlan ? Object.keys(Memory.roomPlans[roomName]).length : ''
    }`,
  (roomName: string, avoidCreeps: boolean = false, opts?: getCostMatrixOptions) => {
    let room = Game.rooms[roomName];
    let costs = new PathFinder.CostMatrix();

    if (opts?.terrain) {
      const terrain = Game.map.getRoomTerrain(roomName);
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) costs.set(x, y, 255);
        }
      }
    }

    if (opts?.roomPlan) {
      for (const s of plannedOfficeStructuresByRcl(roomName, 8)) {
        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType)) {
          costs.set(s.pos.x, s.pos.y, 255);
        }
      }
    }

    if (opts?.territoryPlannedRoadsCost) {
      for (const office in Memory.rooms[roomName]?.franchises ?? {}) {
        for (const s of plannedTerritoryRoads(office)) {
          if (s.pos.roomName === roomName) {
            costs.set(s.pos.x, s.pos.y, opts.territoryPlannedRoadsCost);
          }
        }
      }
    }

    if (opts?.roomPlanAllStructures) {
      for (const s of plannedOfficeStructuresByRcl(roomName, 8)) {
        costs.set(s.pos.x, s.pos.y, 255);
      }
    }

    if (!opts?.ignoreSourceKeepers && isSourceKeeperRoom(roomName)) {
      // Block out radius of 5 around protected sources
      for (let source of sourcePositions(roomName)) {
        for (let pos of calculateNearbyPositions(source, 5, true)) {
          costs.set(pos.x, pos.y, 255);
        }
      }
      const mineral = mineralPosition(roomName);
      if (mineral) {
        for (let pos of calculateNearbyPositions(mineral, 5, true)) {
          costs.set(pos.x, pos.y, 255);
        }
      }
    }

    if (!room) return costs;
    if (!opts?.ignoreStructures) {
      for (const s of plannedOfficeStructuresByRcl(roomName, rcl(roomName))) {
        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType)) {
          costs.set(s.pos.x, s.pos.y, 255);
          if (s.structure instanceof StructureSpawn && s.structure.spawning && s.structure.spawning.remainingTime < 3) {
            // also block spawning squares
            (
              s.structure.spawning?.directions?.map(d => posAtDirection(s.pos, d)) ?? adjacentWalkablePositions(s.pos)
            ).forEach(p => costs.set(p.x, p.y, 0xff));
          }
        } else if (s.structureType === STRUCTURE_ROAD && s.structure && !(costs.get(s.pos.x, s.pos.y) === 0xff)) {
          // Favor roads over plain tiles
          costs.set(s.pos.x, s.pos.y, 1);
        }
      }
    }

    // include dedicated filler sites
    if (!opts?.ignoreFastfiller && Memory.offices[roomName]) {
      for (const pos of fastfillerPositions(roomName)) {
        costs.set(pos.x, pos.y, 0xff);
      }
    }
    if (!opts?.ignoreHQLogistics && Memory.offices[roomName]) {
      const pos = getHeadquarterLogisticsLocation(roomName);
      if (pos) costs.set(pos.x, pos.y, 0xff);
    }
    if (!opts?.ignoreFranchises) {
      sourceIds(roomName)
        .filter(id => Object.keys(Memory.offices).some(o => franchiseActive(o, id)))
        .map(id => posById(id))
        .forEach(pos => {
          if (pos) adjacentWalkablePositions(pos, true).forEach(p => costs.set(p.x, p.y, 0xfe));
        });
    }

    // Avoid creeps in the room
    if (avoidCreeps) {
      room.find(FIND_CREEPS).forEach(function (creep) {
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
);
let costMatrixWithPaths;
export const pathsCostMatrix = memoizeByTick(
  () => 'pathsCostMatrix',
  () => {
    costMatrixWithPaths = new PathFinder.CostMatrix();
    return costMatrixWithPaths;
  }
);
export const blockSquare = (pos: RoomPosition) => pathsCostMatrix().set(pos.x, pos.y, 255);
export const setMove = (pos: RoomPosition, weight = 3) => {
  const cached = pathsCostMatrix();
  if (cached.get(pos.x, pos.y) !== 255) {
    cached.set(pos.x, pos.y, Math.max(0, Math.min(255, (cached.get(pos.x, pos.y) ?? terrainCostAt(pos)) + weight)));
  }
};

export const getPath = (from: RoomPosition, to: RoomPosition, range: number, ignoreRoads = false) => {
  let positionsInRange = calculateNearbyPositions(to, range, true).filter(pos => isPositionWalkable(pos, true));
  if (positionsInRange.length === 0) return;
  let route = PathFinder.search(from, positionsInRange, {
    roomCallback: room => {
      return getCostMatrix(room, false);
    },
    plainCost: ignoreRoads ? 1 : 2,
    swampCost: ignoreRoads ? 5 : 10,
    maxOps: 100000
  });
  if (!route || route.incomplete) return;

  return route;
};
export const getRangeByPath = (from: RoomPosition, to: RoomPosition, range: number, ignoreRoads = false) => {
  const path = getPath(from, to, range, ignoreRoads);
  return !path || path?.incomplete ? undefined : path.cost;
};

export const getRoomPathDistance = memoize(
  (room1: string, room2: string) => [room1, room2].sort().join(''),
  (room1: string, room2: string) => {
    const newRoute = Game.map.findRoute(room1, room2, {
      routeCallback: room => (getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0)
    });
    if (newRoute === -2) return undefined;
    return newRoute.length;
  }
);
