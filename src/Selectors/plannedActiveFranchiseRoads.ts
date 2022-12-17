import { getCachedPath } from 'screeps-cartographer';
import { franchiseIsThreatened } from 'Strategy/Territories/HarassmentZones';
import { plannedFranchiseRoads } from './plannedFranchiseRoads';
import { sourceIds } from './roomCache';

export function plannedActiveFranchiseRoads(office: string) {
  return [
    ...new Set(
      (Memory.offices[office]?.territories ?? [])
        .flatMap(t => sourceIds(t))
        .filter(
          source =>
            (Memory.offices[office].franchises[source]?.lastActive ?? 0) + 2000 > Game.time &&
            !franchiseIsThreatened(office, source)
        )
        .sort((a, b) => (getCachedPath(office + a)?.length ?? 0) - (getCachedPath(office + b)?.length ?? 0))
        .flatMap(source => {
          return plannedFranchiseRoads(office, source);
        })
    )
  ];
}
