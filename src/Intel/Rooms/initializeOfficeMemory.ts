import { ScannedRoomEvent } from 'Intel/events';
import { destroyUnplannedStructures } from 'Selectors/Structures/destroyUnplannedStructures';
import { cityNames } from 'utils/CityNames';

export const initializeOfficeMemory = ({ room, office }: ScannedRoomEvent) => {
  if (!office || Memory.offices[room]) return;

  // Initialize new office
  Memory.offices[room] = {
    city: cityNames.find(name => !Object.values(Memory.offices).some(r => r.city === name)) ?? room,
    resourceQuotas: {
      [RESOURCE_ENERGY]: 10000
    },
    lab: {
      orders: [],
      boosts: [],
      boostingLabs: []
    },
    powerbanks: [],
    franchises: {}
  };

  Memory.rooms[room].rclMilestones ??= {};
  Memory.rooms[room].rclMilestones![Game.rooms[room].controller!.level] ??= Game.time;

  destroyUnplannedStructures(room);
};
