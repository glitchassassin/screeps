import { SpawnOrder } from 'Minions/spawnQueues';
import { createPlunderOrder } from 'Missions/Implementations/Plunder';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { calculateNearbyRooms } from 'Selectors/Map/MapCoordinates';
import { getRoomPathDistance } from 'Selectors/Map/Pathing';
import { roomPlans } from 'Selectors/roomPlans';

const assignedPlunderCapacity = (office: string) => {
  const assignments = new Map<string, number>();

  for (const mission of activeMissions(office).filter(isMission(MissionType.PLUNDER))) {
    if (!mission.data.targetRoom) continue;
    assignments.set(mission.data.targetRoom, (assignments.get(mission.data.targetRoom) ?? 0) + mission.data.capacity);
  }

  return assignments;
};
const neededPlunderCapacity = (office: string) => (room: string) => {
  let distance = (getRoomPathDistance(office, room) ?? 2) * 50;
  let trips = CREEP_LIFE_TIME / distance;
  let capacity = Memory.rooms[room]?.lootEnergy ?? 0;
  if (roomPlans(office)?.headquarters?.terminal) {
    capacity += Memory.rooms[room]?.lootResources ?? 0;
  }
  capacity /= trips;
  return { room, capacity };
};

let lastRun = Game.time;

export default {
  name: 'Plunder',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    if (Game.cpu.bucket < 5000 || !roomPlans(office)?.headquarters?.storage.structure || Game.time - lastRun < 500)
      return []; // don't run when we have low bucket
    lastRun = Game.time;
    const plunderCapacity = assignedPlunderCapacity(office);
    const { room, capacity } =
      calculateNearbyRooms(office, 3, false)
        .map(neededPlunderCapacity(office))
        .find(({ capacity }) => capacity > 0) ?? {};
    if (!room || !capacity) return [];
    const assignedCapacity = plunderCapacity.get(room) ?? 0;
    if (capacity > assignedCapacity) {
      // New Plunder mission needed
      return [createPlunderOrder(office, room)];
    }

    return [];
  }
};
