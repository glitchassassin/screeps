import { MissionType } from 'Missions/Mission';
import { activeCreeps } from 'Missions/Selectors';
import { adjacentWalkablePositions } from 'Selectors/Map/MapCoordinates';
import { memoizeByTick } from 'utils/memoizeFunction';
import { posById } from '../posById';

export const franchiseIsFull = memoizeByTick(
  (office, id) => office + id,
  (office: string, id: Id<Source>) => {
    const pos = posById(id);
    const missions =
      activeCreeps(office).filter(
        m => Memory.creeps[m].mission.type === MissionType.HARVEST && Memory.creeps[m].mission.data.source === id
      ) ?? [];
    const assignedParts = missions
      .flatMap(m => Game.creeps[m])
      .reduce((sum, creep) => sum + (creep?.getActiveBodyparts(WORK) ?? 0), 0);
    if (id && assignedParts >= 5) return true;
    if (!pos || !Game.rooms[pos.roomName]) return false; // Can't find the source, don't know if it's full

    return adjacentWalkablePositions(pos, false).length === 0;
  }
);
