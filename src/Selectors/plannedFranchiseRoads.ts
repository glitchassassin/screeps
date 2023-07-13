import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { getCachedPath } from 'screeps-cartographer';
import { memoizeByTick } from 'utils/memoizeFunction';
import { adjustedEnergyForPlannedStructure, costForPlannedStructure } from './Structures/costForStructure';
import { isOwnedByEnemy, isReservedByEnemy } from './reservations';
import { getFranchisePlanBySourceId } from './roomPlans';

const cachedPaths = new Map<string, RoomPosition[]>();
const cachedPlans = new Map<string, PlannedStructure[]>();
let surveyed = 0;
const MAX_TERRITORY_ROADS = 6;

export const nextFranchiseRoadToBuild = memoizeByTick(
  (office, source) => office + source,
  (office: string, source: Id<Source>) => {
    return plannedFranchiseRoads(office, source).find(
      r => !r.survey() && r.lastSurveyed && !isReservedByEnemy(r.pos.roomName) && !isOwnedByEnemy(r.pos.roomName)
    );
  }
)

export const franchiseRoadsToBuild = memoizeByTick(
  (office, source) => office + source,
  (office: string, source: Id<Source>) => {
    return plannedFranchiseRoads(office, source).filter(
      r => !r.survey() && r.lastSurveyed && !isReservedByEnemy(r.pos.roomName) && !isOwnedByEnemy(r.pos.roomName)
    );
  }
);

export const plannedFranchiseRoads = memoizeByTick(
  (office, source) => office + source,
  (office: string, source: Id<Source>) => {
    const key = office + source;
    const path = franchisePath(office, source);
    const containerPos = getFranchisePlanBySourceId(source)?.container.pos;
    const structures =
      cachedPlans.get(key) ??
      path
        .filter(p => p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49)
        .map(p => new PlannedStructure(p, STRUCTURE_ROAD));
    if (!structures.length) return [];
    cachedPlans.set(key, structures);
    if (containerPos) return [...structures, new PlannedStructure(containerPos, STRUCTURE_CONTAINER)];
    return structures;
  }
);

export function franchisePath(office: string, source: Id<Source>) {
  return getCachedPath(office + source) ?? [];
}

export const plannedFranchiseRoadsCost = memoizeByTick(
  (office, source) => office + source,
  (office: string, source: Id<Source>) => {
    return plannedFranchiseRoads(office, source)
      .map(s => costForPlannedStructure(s, office))
      .reduce((sum, a) => sum + a.cost, 0);
  }
);

export const adjustedPlannedFranchiseRoadsCost = memoizeByTick(
  (office, source) => office + source,
  (office: string, source: Id<Source>) => {
    return plannedFranchiseRoads(office, source)
      .map((s, i) => adjustedEnergyForPlannedStructure(s, i)) // it's a path, so index also represents distance
      .reduce((sum, a) => sum + a, 0);
  }
);
