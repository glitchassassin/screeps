import { TERRITORY_RADIUS, THREAT_TOLERANCE } from 'config';
import { ThreatLevel } from './Combat/threatAnalysis';
import { getRoomPathDistance } from './Map/getRoomPathDistance';
import { calculateNearbyRooms, getClosestOfficeFromMemory, isSourceKeeperRoom } from './Map/MapCoordinates';
import { rcl } from './rcl';

declare global {
  interface OfficeMemory {
    territories?: string[];
    franchises: Record<
      Id<Source>,
      {
        lastActive?: number;
        scores: number[];
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
    const targets = calculateNearbyRooms(office, TERRITORY_RADIUS, false).filter(
      t =>
        Memory.rooms[t] &&
        !isSourceKeeperRoom(t) &&
        !Memory.offices[t] &&
        (getRoomPathDistance(office, t) ?? Infinity) < TERRITORY_RADIUS + 1 &&
        getClosestOfficeFromMemory(t) === office &&
        Memory.rooms[t].threatLevel?.[0] !== ThreatLevel.OWNED &&
        !Memory.rooms[t].owner &&
        (Memory.rooms[t].threatLevel?.[1] ?? 0) <= THREAT_TOLERANCE.remote[rcl(office)]
    );
    Memory.offices[office].territories = [];
    Memory.offices[office].franchises ??= {};
    targets.forEach(t => {
      Memory.rooms[t].office = office;
      Memory.offices[office].territories?.push(t);
    });
  }
}
