import { plannedActiveFranchiseRoads } from 'Selectors/plannedActiveFranchiseRoads';
import { plannedStructuresByRcl } from 'Selectors/plannedStructuresByRcl';

let scanned: Record<string, number> = {};

export const scanRoomPlanStructures = (office: string) => {
  const structures = Game.rooms[office]?.find(FIND_STRUCTURES).length;
  const rcl = Game.rooms[office]?.controller?.level ?? 0;
  if (Game.rooms[office] && (scanned[office] !== structures || Game.time % 50 === 0)) {
    scanned[office] = structures;
    for (let s of plannedStructuresByRcl(office, 8)) {
      s.survey();
    }
    for (let s of plannedActiveFranchiseRoads(office)) {
      s.survey();
    }
  }
};
