import { nextFranchiseRoadToBuild } from '../plannedFranchiseRoads';
import { activeFranchises } from './franchiseActive';

export function franchisesThatNeedRoadWork(office: string) {
  return activeFranchises(office)
    .filter(({ remote, source, room }) => {
      return (
        remote &&
        (Memory.offices[office]?.franchises[source]?.lastActive ?? 0) + 1500 > Game.time &&
        nextFranchiseRoadToBuild(office, source)
      );
    })
    .map(({ source }) => source);
}
