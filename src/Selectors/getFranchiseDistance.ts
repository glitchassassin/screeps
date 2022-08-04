import { memoizeByTick } from 'utils/memoizeFunction';
import { terrainCostAt } from './Map/MapCoordinates';
import { plannedFranchiseRoads } from './plannedTerritoryRoads';
import { posById } from './posById';

export const getFranchiseDistance = memoizeByTick(
  (office: string, sourceId: Id<Source>) => office + posById(sourceId) + plannedFranchiseRoads(office, sourceId).length,
  (office: string, sourceId: Id<Source>) => {
    const roads = plannedFranchiseRoads(office, sourceId);
    if (!roads.length) return undefined;

    let cost = 0;
    for (const road of roads) {
      cost += road.structure ? 1 : terrainCostAt(road.pos);
    }

    return cost;
  }
);
