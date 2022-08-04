import { BackfillPlan } from 'RoomPlanner';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { calculateAdjacentPositions, sortByDistanceTo } from 'Selectors/Map/MapCoordinates';
import { getCostMatrix } from 'Selectors/Map/Pathing';
import { plannedOfficeStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { roomPlans } from 'Selectors/roomPlans';
import { viz } from 'Selectors/viz';
import { validateBackfillPlan } from './validateBackfillPlan';

export const planBackfill = (roomName: string) => {
  const plan: Partial<BackfillPlan> = {
    extensions: [],
    towers: [],
    ramparts: [],
    observer: undefined
  };
  const extensionsPlaced =
    (roomPlans(roomName)?.fastfiller?.extensions.length ?? 0) +
    (roomPlans(roomName)?.franchise1?.extensions.length ?? 0) +
    (roomPlans(roomName)?.franchise2?.extensions.length ?? 0) +
    (roomPlans(roomName)?.extensions?.extensions.length ?? 0) +
    1;
  let extensionsRemaining = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8] - extensionsPlaced;

  let towersRemaining = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][8];

  let cm = getCostMatrix(roomName, false, { roomPlanAllStructures: true, terrain: true });
  const anchor = roomPlans(roomName)?.headquarters?.storage.pos;

  if (!anchor) throw new Error('Unable to plan extensions without headquarters as origin');

  // const flowfield = dijkstraMap(roomName, [anchor], cm.clone());

  const viablePositions = plannedOfficeStructuresByRcl(roomName, 8)
    .filter(s => s.structureType === STRUCTURE_ROAD)
    .sort(sortByDistanceTo(anchor));

  const usedSquares: RoomPosition[] = viablePositions.map(s => s.pos); // start by eliminating all roads
  loop: for (const pos of viablePositions) {
    const placeableSquares = calculateAdjacentPositions(pos.pos).filter(({ x, y }) => cm.get(x, y) !== 255);

    viz(roomName).circle(pos.pos, { radius: 1.5, stroke: 'yellow', fill: 'transparent' });
    for (const square of placeableSquares) {
      if (usedSquares.some(p => p.isEqualTo(square))) continue;
      usedSquares.push(square);
      viz(roomName).circle(square, { radius: 0.5, stroke: 'yellow', fill: 'transparent' });
      if (towersRemaining) {
        plan.towers?.push(new PlannedStructure(square, STRUCTURE_TOWER));
        towersRemaining -= 1;
      } else if (extensionsRemaining > 0) {
        plan.extensions?.push(new PlannedStructure(square, STRUCTURE_EXTENSION));
        extensionsRemaining -= 1;
      } else if (!plan.observer) {
        plan.observer = new PlannedStructure(square, STRUCTURE_OBSERVER);
      } else {
        break loop;
      }
    }
  }

  // plan.ramparts = outlineBackfill(roomName, plan.extensions)
  //     .filter(pos => isPositionWalkable(pos, true))
  //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
  return validateBackfillPlan(plan);
};
