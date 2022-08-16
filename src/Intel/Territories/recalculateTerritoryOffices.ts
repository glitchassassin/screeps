import { TERRITORY_RADIUS } from 'config';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { costMatrixFromRoomPlan } from 'Selectors/costMatrixFromRoomPlan';
import { getOfficeDistanceByRange } from 'Selectors/getOfficeDistance';
import { getRoomPathDistance } from 'Selectors/Map/Pathing';
import { plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { posById } from 'Selectors/posById';
import { sourceIds } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { getTerritoryIntent, TerritoryIntent } from 'Selectors/territoryIntent';
import { packPosList } from 'utils/packrat';

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

function calculateTerritoryData(
  office: string,
  territory: string
): Record<Id<Source>, { path: string; scores: [] }> | undefined {
  const data: Record<Id<Source>, { path: string; scores: [] }> = {};

  const storage = roomPlans(office)?.headquarters?.storage.pos;
  if (!storage) return undefined;
  let sources = sourceIds(territory);
  if (sources.length === 0) return undefined;
  const sourcePaths: PathFinderPath[] = [];
  const roads = new Set<PlannedStructure>();

  // Add known roads
  plannedTerritoryRoads(office).forEach(road => roads.add(road));

  for (const sourceId of sources) {
    const pos = posById(sourceId);
    if (!pos) continue;
    let route = PathFinder.search(
      storage,
      { pos, range: 1 },
      {
        roomCallback: room => {
          if (getTerritoryIntent(room) === TerritoryIntent.AVOID) return false;
          const cm = costMatrixFromRoomPlan(room);
          for (let road of roads) {
            if (road.pos.roomName === room && cm.get(road.pos.x, road.pos.y) !== 255) {
              cm.set(road.pos.x, road.pos.y, 1);
            }
          }
          return cm;
        },
        plainCost: 2,
        swampCost: 10,
        maxOps: 100000
      }
    );
    if (!route.incomplete) {
      sourcePaths.push(route);
      const sourceRoads = new Set<PlannedStructure>();
      route.path.forEach(p => {
        if (p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49) {
          roads.add(new PlannedStructure(p, STRUCTURE_ROAD));
          sourceRoads.add(new PlannedStructure(p, STRUCTURE_ROAD));
        }
      });
      data[sourceId] = { path: packPosList(route.path), scores: [] };
    }
  }

  return data;
}
