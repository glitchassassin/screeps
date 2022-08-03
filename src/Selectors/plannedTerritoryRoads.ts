import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { memoizeByTick } from 'utils/memoizeFunction';
import { adjustedEnergyForPlannedStructure, costForPlannedStructure } from './facilitiesWorkToDo';
import { franchisesByOffice } from './franchisesByOffice';
import { deserializePlannedStructures } from './plannedStructures';
import { posById } from './posById';

const cachedPlans = new Map<string, PlannedStructure[]>();
const MAX_TERRITORY_ROADS = 6;

export function plannedFranchiseRoads(office: string, source: Id<Source>) {
  const pos = posById(source);
  if (!pos) return [];

  const { path } = Memory.rooms[pos.roomName]?.franchises[office]?.[source] ?? {};
  if (!path) return [];

  const structures = cachedPlans.get(path) ?? deserializePlannedStructures(path);
  cachedPlans.set(path, structures);
  return structures;
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

export function franchisesThatNeedRoadWork(office: string) {
  return franchisesByOffice(office)
    .filter(({ remote, source, room }) => {
      return (
        remote &&
        (Memory.rooms[room]?.franchises?.[office]?.[source]?.lastHarvested ?? 0) + 1500 > Game.time &&
        plannedFranchiseRoads(office, source).some(s => !s.structure)
      );
    })
    .map(({ source }) => source);
}

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
