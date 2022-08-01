import { ExtensionsPlan } from 'RoomPlanner';
import { dijkstraMap } from 'RoomPlanner/Algorithms/flowfield';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { applyStamp, fitStamp } from 'RoomPlanner/Stamps/fitStamp';
import { EXTENSION_STAMP } from 'RoomPlanner/Stamps/stamps';
import { getCostMatrix } from 'Selectors/Map/Pathing';
import { roomPlans } from 'Selectors/roomPlans';
import { validateExtensionsPlan } from './validateExtensionsPlan';

export const planExtensions = (roomName: string) => {
  const plan: Partial<ExtensionsPlan> = {
    extensions: [],
    roads: [],
    ramparts: []
  };
  const extensionsPlaced =
    (roomPlans(roomName)?.fastfiller?.extensions.length ?? 0) +
    (roomPlans(roomName)?.franchise1?.extensions.length ?? 0) +
    (roomPlans(roomName)?.franchise2?.extensions.length ?? 0) +
    1;
  const extensionsRemaining = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8] - extensionsPlaced;
  const stampCount = Math.floor(extensionsRemaining / 5);

  if (stampCount <= 0) return validateExtensionsPlan(plan);

  let cm = getCostMatrix(roomName, false, { roomPlan: true, terrain: true });
  const anchor = roomPlans(roomName)?.headquarters?.storage.pos;

  if (!anchor) throw new Error('Unable to plan extensions without headquarters as origin');

  const flowfield = dijkstraMap(roomName, [anchor], cm.clone());

  const stampPositions = [];
  for (let i = 0; i < stampCount; i++) {
    const squares = fitStamp(roomName, EXTENSION_STAMP, cm, true);
    if (!squares.length) break;
    const best = squares.reduce((a, b) => (flowfield.get(a.x + 2, a.y + 2) < flowfield.get(b.x + 2, b.y + 2) ? a : b));
    stampPositions.push(best);
    cm = applyStamp(EXTENSION_STAMP, best, cm);
  }
  stampPositions.forEach(({ x, y }) =>
    new RoomVisual(roomName).poly(
      [
        [x - 0.5, y + 2],
        [x + 2, y - 0.5],
        [x + 4.5, y + 2],
        [x + 2, y + 4.5],
        [x - 0.5, y + 2]
      ],
      { stroke: 'red', fill: 'transparent' }
    )
  );

  for (const pos of stampPositions) {
    EXTENSION_STAMP.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === STRUCTURE_EXTENSION) {
          plan.extensions?.push(
            new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, roomName), STRUCTURE_EXTENSION)
          );
        }
        if (cell === STRUCTURE_ROAD) {
          plan.roads?.push(new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, roomName), STRUCTURE_ROAD));
        }
      });
    });
  }
  // plan.ramparts = outlineExtensions(roomName, plan.extensions)
  //     .filter(pos => isPositionWalkable(pos, true))
  //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
  return validateExtensionsPlan(plan);
};
