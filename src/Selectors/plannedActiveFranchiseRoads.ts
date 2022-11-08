import { getCachedPath } from 'screeps-cartographer';
import { isThreatened } from 'Strategy/Territories/HarassmentZones';
import { plannedFranchiseRoads } from './plannedFranchiseRoads';

export function plannedActiveFranchiseRoads(office: string) {
  return [
    ...new Set(
      (Memory.offices[office]?.territories ?? [])
        .flatMap(t => Object.entries(Memory.rooms[t]?.franchises?.[office] ?? {}))
        .filter(
          ([source, franchise]) =>
            franchise.lastActive &&
            franchise.lastActive + 1000 > Game.time &&
            !isThreatened(office, source as Id<Source>)
        )
        .sort(([_a, a], [_b, b]) => (getCachedPath(office + a)?.length ?? 0) - (getCachedPath(office + b)?.length ?? 0))
        .flatMap(([source]) => {
          return plannedFranchiseRoads(office, source as Id<Source>);
        })
    )
  ];
}
