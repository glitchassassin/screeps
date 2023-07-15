import { TERRITORY_RADIUS, THREAT_TOLERANCE } from 'config';
import { ThreatLevel } from './Combat/threatAnalysis';
import { calculateNearbyRooms, getClosestOfficeFromMemory, isSourceKeeperRoom } from './Map/MapCoordinates';
import { getRoomPathDistance } from './Map/getRoomPathDistance';
import { rcl } from './rcl';
import { sourceIds } from './roomCache';

declare global {
  interface OfficeMemory {
    territories?: string[];
    franchises: Record<
      Id<Source>,
      {
        lastActive?: number;
        scores: number[];
        disabledUntil?: number;
      }
    >;
  }
}

export const getTerritoriesByOffice = (office: string) => {
  recalculateTerritories();
  return Memory.offices[office]?.territories ?? [];
};

let lastCalculatedTick = 0;
function recalculateTerritories() {
  // if (Game.cpu.bucket < 500) return; // don't recalculate with low bucket
  if (Game.time - lastCalculatedTick < 50) return; // run once every 50 ticks
  lastCalculatedTick = Game.time;

  for (const office in Memory.offices) {
    const targets = [];

    // limit distance by CPU
    let franchiseDistanceLimit = (Game.cpu.limit / Object.keys(Memory.offices).length) * 10; // magic number in lieu of detailed calculation
    for (const { room, totalDistance } of calculateNearbyRooms(office, TERRITORY_RADIUS, false).filter(
      t => // filter to valid territories
        Memory.rooms[t] &&
        !isSourceKeeperRoom(t) &&
        !Memory.offices[t] &&
        (getRoomPathDistance(office, t) ?? Infinity) < TERRITORY_RADIUS + 1 &&
        getClosestOfficeFromMemory(t) === office &&
        Memory.rooms[t].threatLevel?.[0] !== ThreatLevel.OWNED &&
        !Memory.rooms[t].owner &&
        (Memory.rooms[t].threatLevel?.[1] ?? 0) <= THREAT_TOLERANCE.remote[rcl(office)]
    ).map(room => { // calculate average and total franchise distance for the territory
      const averageDistance = (getRoomPathDistance(office, room) ?? Infinity) * 50
      const totalDistance = averageDistance * sourceIds(room).length;
      return {
        room,
        totalDistance,
        averageDistance,
      }
    }).sort((a, b) => a.averageDistance - b.averageDistance)) { // sort by average distance
      // add territory if its franchises fit within the distance limit
      if (totalDistance <= franchiseDistanceLimit) {
        targets.push(room);
        franchiseDistanceLimit -= totalDistance;
      }
    }

    Memory.offices[office].territories = [];
    Memory.offices[office].franchises ??= {};
    targets.forEach(t => {
      Memory.rooms[t].office = office;
      Memory.offices[office].territories?.push(t);
    });
  }
}
