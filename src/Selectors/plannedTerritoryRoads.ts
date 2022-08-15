import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { memoizeByTick } from 'utils/memoizeFunction';
import { unpackPosList } from 'utils/packrat';
import { posById } from './posById';
import { isOwnedByEnemy, isReservedByEnemy } from './reservations';
import { adjustedEnergyForPlannedStructure, costForPlannedStructure } from './Structures/facilitiesWorkToDo';

const cachedPaths = new Map<string, RoomPosition[]>();
const cachedPlans = new Map<string, PlannedStructure[]>();
let surveyed = 0;
const MAX_TERRITORY_ROADS = 6;

export function nextFranchiseRoadToBuild(office: string, source: Id<Source>) {
  return plannedFranchiseRoads(office, source).find(r => {
    if (!r.survey()) {
      console.log('Missing planned road', r.structureId, r.pos);
    }
    return !r.survey() && r.lastSurveyed && !isReservedByEnemy(r.pos.roomName) && !isOwnedByEnemy(r.pos.roomName);
  });
}

export function plannedFranchiseRoads(office: string, source: Id<Source>) {
  const key = office + source;
  const structures =
    cachedPlans.get(key) ??
    franchisePath(office, source)
      .filter(p => p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49)
      .map(p => new PlannedStructure(p, STRUCTURE_ROAD));
  if (structures.length) cachedPlans.set(key, structures);
  return structures;
}

export function franchisePath(office: string, source: Id<Source>) {
  const pos = posById(source);
  if (!pos) return [];

  const { path } = Memory.rooms[pos.roomName]?.franchises[office]?.[source] ?? {};
  if (!path) return [];

  const unpackedPath = cachedPaths.get(path) ?? unpackPosList(path);
  cachedPaths.set(path, unpackedPath);
  return unpackedPath;
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

export function plannedTerritoryRoads(office: string) {
  return [
    ...new Set(
      (Memory.offices[office]?.territories ?? [])
        .flatMap(t => Object.entries(Memory.rooms[t]?.franchises?.[office] ?? {}))
        .filter(([_, franchise]) => franchise.lastHarvested && franchise.lastHarvested + 1000 > Game.time)
        .sort(([_a, a], [_b, b]) => a.path.length - b.path.length)
        .flatMap(([source]) => {
          return plannedFranchiseRoads(office, source as Id<Source>);
        })
    )
  ];
}
