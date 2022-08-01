import { LibraryPlan } from 'RoomPlanner';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import {
  adjacentWalkablePositions,
  calculateNearbyPositions,
  getRangeTo,
  isPositionWalkable
} from 'Selectors/Map/MapCoordinates';
import { controllerPosition } from 'Selectors/roomCache';
import { validateLibraryPlan } from './validateLibraryPlan';

// high score wins
const scorePos = (pos: RoomPosition) =>
  calculateNearbyPositions(pos, 2, false).filter(pos => isPositionWalkable(pos, true, true)).length;

export const planLibrary = (roomName: string) => {
  const plan: Partial<LibraryPlan> = {
    container: undefined,
    link: undefined
  };

  const controller = controllerPosition(roomName);

  if (!controller) throw new Error('Unable to plan Library without controller');

  plan.walls = adjacentWalkablePositions(controller, true).map(pos => new PlannedStructure(pos, STRUCTURE_WALL));

  const viableSquares = calculateNearbyPositions(controller, 2, false).filter(p => isPositionWalkable(p, true, true));
  const containerPos = viableSquares.reduce((a, b) => (scorePos(a) >= scorePos(b) ? a : b));
  const linkPos = adjacentWalkablePositions(containerPos, true)
    .filter(p => getRangeTo(p, controller) === 2)
    .reduce((a, b) => (scorePos(a) >= scorePos(b) ? a : b));

  if (containerPos) {
    plan.container = new PlannedStructure(containerPos, STRUCTURE_CONTAINER);
    new RoomVisual(roomName).circle(containerPos, { fill: 'transparent', stroke: 'yellow', radius: 0.5 });
  }
  if (linkPos) {
    plan.link = new PlannedStructure(linkPos, STRUCTURE_LINK);
    new RoomVisual(roomName).circle(linkPos, { fill: 'transparent', stroke: 'green', radius: 0.5 });
  }

  return validateLibraryPlan(plan);
};
