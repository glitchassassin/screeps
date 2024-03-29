import { calculateNearbyPositions, terrainCostAt } from 'Selectors/Map/MapCoordinates';
import { memoize } from 'utils/memoizeFunction';
import { Coord } from 'utils/packrat';

export function flowfields(room: string, pointsOfInterest: Record<string, Coord[]>, obstacles?: CostMatrix) {
  const flowfields: Record<string, CostMatrix> = {};
  for (const poi in pointsOfInterest) {
    flowfields[poi] = dijkstraMap(
      room,
      pointsOfInterest[poi].map(p => new RoomPosition(p.x, p.y, room)),
      obstacles
    );
  }
  return flowfields;
}

export const dijkstraMap = memoize(
  (room: string, source: RoomPosition[], obstacles?: CostMatrix, useTerrainCost = true) =>
    `${room}_${source}_${useTerrainCost}`,
  (room: string, source: RoomPosition[], obstacles = new PathFinder.CostMatrix(), useTerrainCost = true) => {
    const frontier = source.slice();
    const terrain = Game.map.getRoomTerrain(room);
    const cm = new PathFinder.CostMatrix();

    while (frontier.length) {
      const current = frontier.shift()!;
      for (const next of calculateNearbyPositions(current, 1)) {
        if (
          terrain.get(next.x, next.y) === TERRAIN_MASK_WALL ||
          obstacles.get(next.x, next.y) === 255 ||
          source.some(s => s.isEqualTo(next))
        )
          continue;

        const nextCost = cm.get(current.x, current.y) + (useTerrainCost ? terrainCostAt(next) : 1);

        if (cm.get(next.x, next.y) === 0 || cm.get(next.x, next.y) > nextCost) {
          frontier.push(next);
          cm.set(next.x, next.y, nextCost);
        }
      }
    }

    return cm;
  }
);
