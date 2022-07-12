import { createPlunderMission } from "Missions/Implementations/Plunder";
import { MissionType } from "Missions/Mission";
import { calculateNearbyRooms } from "Selectors/MapCoordinates";
import { roomPlans } from "Selectors/roomPlans";

const assignedPlunderCapacity = (office: string) => {
  const assignments = new Map<string, number>();

  for (const mission of Memory.offices[office].activeMissions) {
    if (mission.type !== MissionType.PLUNDER || !mission.data.targetRoom) continue;
    assignments.set(
      mission.data.targetRoom,
      (assignments.get(mission.data.targetRoom) ?? 0) + mission.data.capacity
    );
  }

  return assignments
}
const neededPlunderCapacity = (office: string) => (room: string) => {
  let capacity = Memory.rooms[room]?.lootEnergy ?? 0;
  if (roomPlans(office)?.headquarters?.terminal) {
    capacity += (Memory.rooms[room]?.lootResources ?? 0);
  }
  return { room, capacity };
}

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const plunderCapacity = assignedPlunderCapacity(office);
    for (const {room, capacity } of calculateNearbyRooms(office, 3, false).map(neededPlunderCapacity(office))) {
      if (capacity > (plunderCapacity.get(room) ?? 0)) {
        // New Plunder mission needed
        Memory.offices[office].pendingMissions.push(createPlunderMission(office, room));
      }
    }
  }
}
