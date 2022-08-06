import { franchisesByOffice } from './franchisesByOffice';
import { plannedFranchiseRoads } from './plannedTerritoryRoads';
import { isOwnedByEnemy, isReservedByEnemy } from './reservations';

export function franchisesThatNeedRoadWork(office: string) {
  return franchisesByOffice(office)
    .filter(({ remote, source, room }) => {
      return (
        remote &&
        (Memory.rooms[room]?.franchises?.[office]?.[source]?.lastHarvested ?? 0) + 1500 > Game.time &&
        plannedFranchiseRoads(office, source).some(
          r => !r.structure && !isReservedByEnemy(r.pos.roomName) && !isOwnedByEnemy(r.pos.roomName)
        )
      );
    })
    .map(({ source }) => source);
}
