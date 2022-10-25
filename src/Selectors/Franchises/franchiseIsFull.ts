import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { adjacentWalkablePositions } from 'Selectors/Map/MapCoordinates';
import { sum } from 'Selectors/reducers';
import { memoizeByTick } from 'utils/memoizeFunction';
import { posById } from '../posById';

export const franchiseIsFull = memoizeByTick(
  (office, id) => office + id,
  (office: string, id: Id<Source>) => {
    const pos = posById(id);
    const harvestRate = activeMissions(office)
      .filter(isMission(HarvestMission))
      .filter(m => m.missionData.source === id)
      .map(m => m.harvestRate())
      .reduce(sum, 0);
    if (id && harvestRate >= 10) return true;
    if (!pos || !Game.rooms[pos.roomName]) return false; // Can't find the source, don't know if it's full

    return adjacentWalkablePositions(pos, false).length === 0;
  }
);
