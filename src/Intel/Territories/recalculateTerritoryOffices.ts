import { TERRITORY_RADIUS } from 'config';
import { cachePath, resetCachedPath } from 'screeps-cartographer';
import { getOfficeDistanceByRange } from 'Selectors/getOfficeDistance';
import { getCostMatrix, getRoomPathDistance } from 'Selectors/Map/Pathing';
import { sourceIds } from 'Selectors/roomCache';
import { getFranchisePlanBySourceId, roomPlans } from 'Selectors/roomPlans';
import { getTerritoryIntent, TerritoryIntent } from 'Selectors/territoryIntent';

declare global {
  namespace NodeJS {
    interface Global {
      resetTerritories(): void;
    }
  }
}

global.resetTerritories = () => {
  for (const room in Memory.rooms) {
    Memory.rooms[room].officesInRange = '';
    Memory.rooms[room].franchises = {};
    for (const source of sourceIds(room)) {
      for (const office in Memory.offices) {
        resetCachedPath(office + source);
      }
    }
  }
};

export function recalculateTerritoryOffices(room: string) {
  const officesInRange = Object.keys(Memory.offices)
    .filter(o => {
      const range = getOfficeDistanceByRange(o, room);
      if (range > TERRITORY_RADIUS) return false;
      const distance = getRoomPathDistance(o, room);
      if (distance === undefined || distance > TERRITORY_RADIUS) return false;
      return true;
    })
    .sort();
  const key = officesInRange.join('_');
  if (roomPlans(room) && Memory.rooms[room].officesInRange !== key) {
    console.log('Offices in range of', room, 'have changed, recalculating paths');
    Memory.rooms[room].officesInRange = key;
    // Offices in range of this room have changed; recalculate paths, if needed
    for (const office of officesInRange) {
      const data = calculateTerritoryData(office, room);
      if (data) Memory.rooms[room].franchises[office] = data;
    }
  }
}

function calculateTerritoryData(office: string, territory: string): Record<Id<Source>, { scores: [] }> | undefined {
  const data: Record<Id<Source>, { scores: [] }> = {};

  const storage = roomPlans(office)?.headquarters?.storage.pos;
  if (!storage) return undefined;
  let sources = sourceIds(territory);
  if (sources.length === 0) return undefined;

  // Add known roads

  for (const sourceId of sources) {
    const harvestPos = getFranchisePlanBySourceId(sourceId)?.container.pos;
    if (!harvestPos) continue;
    const path = cachePath(
      office + sourceId,
      storage,
      { pos: harvestPos, range: 1 },
      {
        roomCallback: (room: string) => {
          if (getTerritoryIntent(room) === TerritoryIntent.AVOID) return false;
          return getCostMatrix(room, false, { territoryPlannedRoadsCost: 1 });
        },
        plainCost: 2,
        swampCost: 2,
        roadCost: 1,
        maxOps: 100000
      }
    );
    if (path) {
      data[sourceId] = { scores: [] };
    }
  }

  return data;
}
