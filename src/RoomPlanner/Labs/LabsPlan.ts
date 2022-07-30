import { LabsPlan } from 'RoomPlanner';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { costMatrixFromRoomPlan } from 'Selectors/costMatrixFromRoomPlan';
import { calculateAdjacentPositions } from 'Selectors/Map/MapCoordinates';
import { roomPlans } from 'Selectors/roomPlans';
import { validatePathsToPointsOfInterest } from 'Selectors/validatePathsToPointsOfInterest';
import { validateLabsPlan } from '../Stamps/validateLabsPlan';

const LABS_STAMP: (BuildableStructureConstant | undefined)[][] = [
  [STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, undefined],
  [STRUCTURE_LAB, STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB],
  [STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD, STRUCTURE_LAB],
  [undefined, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD]
];
const LABS_MIRRORED_STAMP = LABS_STAMP.map(row => row.slice().reverse());

const LABS_ORDER = [
  [1, 2],
  [2, 1],
  [2, 3],
  [1, 3],
  [3, 2],
  [3, 1],
  [0, 1],
  [0, 2],
  [1, 0],
  [2, 0]
];

const LABS_MIRRORED_ORDER = LABS_ORDER.map(([x, y]) => [LABS_STAMP[0].length - 1 - x, y]);

const PATHABLE_STAMP: boolean[][] = [
  [true, false, false, true],
  [false, false, false, false],
  [false, false, false, false],
  [true, false, false, true]
];

const mirroredStampCorners = (origin: RoomPosition, stamp: unknown[][]) => {
  return [
    new RoomPosition(origin.x + stamp.length, origin.y, origin.roomName),
    new RoomPosition(origin.x, origin.y + stamp[0].length, origin.roomName)
  ];
};

const defaultStampCorners = (origin: RoomPosition, stamp: unknown[][]) => {
  return [
    new RoomPosition(origin.x, origin.y, origin.roomName),
    new RoomPosition(origin.x + stamp.length, origin.y + stamp[0].length, origin.roomName)
  ];
};

export const planLabs = (room: string) => {
  // Find space for stamp close to headquarters
  const storagePos = roomPlans(room)?.headquarters?.storage.pos;
  if (!storagePos) return undefined;
  const cm = costMatrixFromRoomPlan(room);

  let bestPos: RoomPosition | undefined = undefined;
  let bestDistance = Infinity;
  let bestOrientationIsDefault = true;

  for (const space of findSpaces(storagePos, cm)) {
    let costMatrix = cm.clone();

    if (
      defaultStampCorners(space, LABS_STAMP)
        .concat(mirroredStampCorners(space, LABS_STAMP))
        .some(corner => calculateAdjacentPositions(corner).some(pos => costMatrix.get(pos.x, pos.y) === 255))
    ) {
      continue;
    }

    for (let y = 0; y < PATHABLE_STAMP.length; y++) {
      for (let x = 0; x < PATHABLE_STAMP[y].length; x++) {
        if (PATHABLE_STAMP[y][x]) {
          continue;
        } else {
          costMatrix.set(space.x + x, space.y + y, 255);
        }
      }
    }

    // Validate paths with stamp
    if (!validatePathsToPointsOfInterest(room, costMatrix, space)) continue; // This layout blocks paths

    // Score and test paths
    let minPath = Infinity;
    let defaultOrientation = true;
    for (let pos of defaultStampCorners(space, LABS_STAMP)) {
      const path = PathFinder.search(
        pos,
        { pos: storagePos, range: 1 },
        { maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10 }
      );
      if (!path.incomplete && path.cost < minPath) {
        minPath = path.cost;
      }
    }
    for (let pos of mirroredStampCorners(space, LABS_STAMP)) {
      const path = PathFinder.search(
        pos,
        { pos: storagePos, range: 1 },
        { maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10 }
      );
      if (!path.incomplete && path.cost < minPath) {
        minPath = path.cost;
        defaultOrientation = false;
      }
    }
    if (minPath < bestDistance) {
      bestDistance = minPath;
      bestPos = space;
      bestOrientationIsDefault = defaultOrientation;
    }
  }

  if (!bestPos) throw new Error('No position for labs found');

  // Best position found

  const plan: LabsPlan = { labs: [], roads: [] };
  const stamp = bestOrientationIsDefault ? LABS_STAMP : LABS_MIRRORED_STAMP;
  const order = bestOrientationIsDefault ? LABS_ORDER : LABS_MIRRORED_ORDER;
  const corners = bestOrientationIsDefault
    ? defaultStampCorners(bestPos, LABS_STAMP)
    : mirroredStampCorners(bestPos, LABS_STAMP);

  for (let [x, y] of order) {
    plan.labs.push(new PlannedStructure(new RoomPosition(bestPos.x + x, bestPos.y + y, room), STRUCTURE_LAB));
    cm.set(bestPos.x + x, bestPos.y + y, 255);
  }

  for (let y = 0; y < stamp.length; y++) {
    for (let x = 0; x < stamp[y].length; x++) {
      const tile = stamp[y][x];
      if (tile === undefined) {
        continue;
      } else if (tile === STRUCTURE_ROAD) {
        plan.roads.push(new PlannedStructure(new RoomPosition(bestPos.x + x, bestPos.y + y, room), tile));
        cm.set(bestPos.x + x, bestPos.y + y, 1);
      }
    }
  }
  let roads = new Set<PlannedStructure<STRUCTURE_ROAD>>();
  let distance = 0;
  for (let pos of corners) {
    let path = PathFinder.search(
      pos,
      { pos: storagePos, range: 1 },
      { maxRooms: 1, roomCallback: () => cm, plainCost: 2, swampCost: 10 }
    );
    if (!path.incomplete) {
      path.path.forEach(p => {
        roads.add(new PlannedStructure(p, STRUCTURE_ROAD));
        cm.set(p.x, p.y, 1);
      });
      distance += path.cost;
    }
  }
  plan.roads = plan.roads.concat(Array.from(roads));

  return validateLabsPlan(plan);
};

function* findSpaces(headquartersPos: RoomPosition, currentRoomPlan: CostMatrix) {
  // Lay out the grid, cropping for edges
  let x = Math.max(2, headquartersPos.x - 10);
  let y = Math.max(2, headquartersPos.y - 10);
  let width = Math.min(47, headquartersPos.x + 10) - x + 1;
  let height = Math.min(47, headquartersPos.y + 10) - y + 1;

  let stamp = {
    x: LABS_STAMP.length,
    y: LABS_STAMP[0].length
  };

  let grid: { x: number; y: number }[][] = [];
  let terrain = Game.map.getRoomTerrain(headquartersPos.roomName);

  for (let yGrid = 0; yGrid < height; yGrid++) {
    grid[yGrid] = [];
    for (let xGrid = 0; xGrid < width; xGrid++) {
      // For each cell...
      let t = terrain.get(x + xGrid, y + yGrid);
      // If the cell is a wall, or occupied by a planned structure, reset its value to 0,0
      if (t === TERRAIN_MASK_WALL || currentRoomPlan.get(x + xGrid, y + yGrid) === 255) {
        grid[yGrid][xGrid] = { x: 0, y: 0 };
        continue;
      }
      // Otherwise, increment it based on the value of
      // its top and left neighbors
      grid[yGrid][xGrid] = {
        x: 1 + (grid[yGrid]?.[xGrid - 1]?.x ?? 0),
        y: 1 + (grid[yGrid - 1]?.[xGrid]?.y ?? 0)
      };

      // If the values are greater than stamp dimensions, and opposite corners agree, there is room for a lab
      // This is a shortcut assuming the stamp is square (for labs it is)
      if (
        grid[yGrid][xGrid].x >= stamp.x &&
        grid[yGrid][xGrid].y >= stamp.y &&
        (grid[yGrid][xGrid - stamp.x + 1]?.y ?? 0) >= stamp.y &&
        (grid[yGrid - stamp.y + 1]?.[xGrid].x ?? 0) >= stamp.x
      ) {
        yield new RoomPosition(x + xGrid - stamp.x + 1, y + yGrid - stamp.y + 1, headquartersPos.roomName);
      }
    }
  }
}
