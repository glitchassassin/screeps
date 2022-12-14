import { ScannedRoomEvent } from 'Intel/events';
import { plannedActiveFranchiseRoads } from 'Selectors/plannedActiveFranchiseRoads';
import { plannedStructuresByRcl } from 'Selectors/plannedStructuresByRcl';

let scanned: Record<string, number> = {};

export const scanRoomPlanStructures = ({ room, office }: ScannedRoomEvent) => {
  if (!office) return;
  const structures = Game.rooms[room]?.find(FIND_STRUCTURES).length;
  const rcl = Game.rooms[room]?.controller?.level ?? 0;
  if (Game.rooms[room] && (scanned[room] !== structures || Game.time % 50 === 0)) {
    scanned[room] = structures;
    for (let s of plannedStructuresByRcl(room, 8)) {
      s.survey();
    }
    for (let s of plannedActiveFranchiseRoads(room)) {
      s.survey();
    }
  }
};
