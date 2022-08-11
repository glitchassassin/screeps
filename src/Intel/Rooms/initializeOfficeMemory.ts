import { destroyUnplannedStructures } from 'Selectors/Structures/facilitiesWorkToDo';
import { cityNames } from 'utils/CityNames';

export function initializeOfficeMemory(room: string) {
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
    spawnQueue: [],
    pendingMissions: [],
    activeMissions: [],
    missionResults: {}
  };
  destroyUnplannedStructures(room);
}
