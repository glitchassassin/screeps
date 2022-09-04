import { TERRITORY_RADIUS } from 'config';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { cachePath } from 'screeps-cartographer';
import { getOfficeDistanceByRange } from 'Selectors/getOfficeDistance';
import { getRoomPathDistance } from 'Selectors/Map/Pathing';
import { plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { posById } from 'Selectors/posById';
import { sourceIds } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { getTerritoryIntent, TerritoryIntent } from 'Selectors/territoryIntent';

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
  if (Memory.rooms[room].officesInRange !== key) {
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
  const roads = new Set<PlannedStructure>();

  // Add known roads
  plannedTerritoryRoads(office).forEach(road => roads.add(road));

  for (const sourceId of sources) {
    const pos = posById(sourceId);
    if (!pos) continue;
    const path = cachePath(
      office + sourceId,
      storage,
      { pos, range: 1 },
      {
        roomCallback: (room: string) => {
          return getTerritoryIntent(room) !== TerritoryIntent.AVOID;
        },
        plainCost: 2,
        swampCost: 2,
        roadCost: 1,
        maxOps: 100000
      }
    );
    if (path) {
      const sourceRoads = new Set<PlannedStructure>();
      path.forEach(p => {
        if (p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49) {
          roads.add(new PlannedStructure(p, STRUCTURE_ROAD));
          sourceRoads.add(new PlannedStructure(p, STRUCTURE_ROAD));
        }
      });
      data[sourceId] = { scores: [] };
    }
  }

  return data;
}
