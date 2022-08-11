import { nextFranchiseRoadToBuild } from '../plannedTerritoryRoads';
import { franchisesByOffice } from './franchisesByOffice';

export function franchisesThatNeedRoadWork(office: string) {
  return franchisesByOffice(office)
    .filter(({ remote, source, room }) => {
      return (
        remote &&
        (Memory.rooms[room]?.franchises?.[office]?.[source]?.lastHarvested ?? 0) + 1500 > Game.time &&
        nextFranchiseRoadToBuild(office, source)
      );
    })
    .map(({ source }) => source);
}
