import { terrainCostAt } from 'Selectors/Map/MapCoordinates';
import { plannedFranchiseRoads } from 'Selectors/plannedTerritoryRoads';
import { posById } from 'Selectors/posById';
import { memoizeByTick } from 'utils/memoizeFunction';

export const getFranchiseDistance = memoizeByTick(
  (office: string, sourceId: Id<Source>) => office + posById(sourceId) + plannedFranchiseRoads(office, sourceId).length,
  (office: string, sourceId: Id<Source>) => {
    const roads = plannedFranchiseRoads(office, sourceId);
    if (!roads.length) return undefined;

    let cost = 0;
    for (const road of roads) {
      cost += road.structureId ? 1 : terrainCostAt(road.pos);
    }

    return cost;
  }
);
