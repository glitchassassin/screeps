import { getCachedPath } from 'screeps-cartographer';
import { memoize } from 'utils/memoizeFunction';

export const franchiseDefenseRooms = memoize(
  (office: string, franchise: Id<Source>) => `${getCachedPath(office + franchise)?.length}`,
  (office: string, franchise: Id<Source>) => {
    return (
      getCachedPath(office + franchise)?.reduce((rooms, road) => {
        if (!rooms.includes(road.roomName)) rooms.push(road.roomName);
        return rooms;
      }, [] as string[]) ?? []
    );
  }
);
