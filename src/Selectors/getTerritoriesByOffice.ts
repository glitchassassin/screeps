import { TERRITORY_RADIUS, THREAT_TOLERANCE } from 'config';
import { ThreatLevel } from './Combat/threatAnalysis';
import { calculateNearbyRooms, getClosestOfficeFromMemory, isSourceKeeperRoom } from './Map/MapCoordinates';
import { rcl } from './rcl';

declare global {
  interface OfficeMemory {
    territories?: string[];
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
    const targets = calculateNearbyRooms(office, TERRITORY_RADIUS, false).filter(t => {
      console.log(
        t,
        !isSourceKeeperRoom(t),
        Memory.rooms[t]?.franchises[office],
        !Memory.offices[t],
        getClosestOfficeFromMemory(t) === office,
        Memory.rooms[t].threatLevel?.[0] !== ThreatLevel.OWNED,
        !Memory.rooms[t].owner,
        (Memory.rooms[t].threatLevel?.[1] ?? 0) <= THREAT_TOLERANCE.remote[rcl(office)]
      );
      return (
        !isSourceKeeperRoom(t) &&
        Memory.rooms[t]?.franchises[office] &&
        !Memory.offices[t] &&
        getClosestOfficeFromMemory(t) === office &&
        Memory.rooms[t].threatLevel?.[0] !== ThreatLevel.OWNED &&
        !Memory.rooms[t].owner &&
        (Memory.rooms[t].threatLevel?.[1] ?? 0) <= THREAT_TOLERANCE.remote[rcl(office)]
      );
    });
    Memory.offices[office].territories = [];
    targets.forEach(t => {
      Memory.rooms[t].office = office;
      Memory.offices[office].territories?.push(t);
    });
  }
}
