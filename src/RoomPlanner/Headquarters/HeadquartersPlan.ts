import { HeadquartersPlan } from "RoomPlanner";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { costMatrixFromRoomPlan } from "Selectors/costMatrixFromRoomPlan";
import { calculateAdjacentPositions, isPositionWalkable } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";
import { validatePathsToPointsOfInterest } from "Selectors/validatePathsToPointsOfInterest";
import { validateHeadquartersPlan } from "./validateHeadquartersPlan";


const HQ_UPGRADE_LEFT: (BuildableStructureConstant|undefined)[][] = [
    [undefined,         STRUCTURE_TOWER,    STRUCTURE_TOWER,    STRUCTURE_TOWER],
    [STRUCTURE_ROAD,    STRUCTURE_TOWER,    undefined,          STRUCTURE_TOWER],
    [STRUCTURE_ROAD,    STRUCTURE_STORAGE,  STRUCTURE_SPAWN,    STRUCTURE_TOWER],
    [STRUCTURE_ROAD,    STRUCTURE_ROAD,     undefined,          STRUCTURE_LINK],
    [undefined,         STRUCTURE_TERMINAL, STRUCTURE_FACTORY,  STRUCTURE_POWER_SPAWN],
]

const HQ_UPGRADE_RIGHT = HQ_UPGRADE_LEFT.map(row => row.slice().reverse());

const HQ_UPGRADE_TOP = HQ_UPGRADE_LEFT[0].map((k, i) => HQ_UPGRADE_LEFT.map(row => row[i]))

const HQ_UPGRADE_BOTTOM = HQ_UPGRADE_RIGHT[0].map((k, i) => HQ_UPGRADE_RIGHT.map(row => row[i]))

// Anchor should be in range 3 of controller
const ANCHOR_LEFT = { x: 0, y: 2 };
const ANCHOR_RIGHT = { x: 3, y: 2 };
const ANCHOR_TOP = { x: 2, y: 2 };
const ANCHOR_BOTTOM = { x: 2, y: 3 };
// Spawn should not be
const SPAWN_LEFT = { x: 2, y: 2 };
const SPAWN_RIGHT = { x: 1, y: 2 };
const SPAWN_TOP = { x: 2, y: 2 };
const SPAWN_BOTTOM = { x: 2, y: 1 };

export const planHeadquarters = (roomName: string) => {
    // Calculate from scratch
    if (!Memory.rooms[roomName]) throw new Error('No data cached for planning room')
    let controllerPos = posById(Memory.rooms[roomName].controllerId)
    if (!controllerPos) throw new Error('No known controller in room, unable to compute plan')
    let sources = Memory.rooms[roomName].sourceIds?.map(s => posById(s)).filter(s => s) as RoomPosition[] ?? []
    if (sources.length < 2) throw new Error('Expected two sources for headquarters planning');

    let currentRoomPlan = costMatrixFromRoomPlan(roomName);

    let bestDistance = Infinity;
    let bestPlan: Partial<HeadquartersPlan> = {};

    for (let space of findSpaces(controllerPos, currentRoomPlan)) {
        let plan: Partial<HeadquartersPlan> = {
            spawn: undefined,
            link: undefined,
            factory: undefined,
            powerSpawn: undefined,
            storage: undefined,
            terminal: undefined,
            towers: [],
            roads: [],
            walls: [],
        }

        // Get the upgrade location closest to Controller
        let orientation: (BuildableStructureConstant|undefined)[][]|undefined = undefined;
        let anchor: {x: number, y: number}|undefined = undefined;
        if (space.horizontal) {
            if (new RoomPosition(space.x + ANCHOR_BOTTOM.x, space.y + ANCHOR_BOTTOM.y, controllerPos.roomName).inRangeTo(controllerPos, 3)) {
                orientation = HQ_UPGRADE_BOTTOM;
                anchor = ANCHOR_BOTTOM;
            } else if (new RoomPosition(space.x + ANCHOR_TOP.x, space.y + ANCHOR_TOP.y, controllerPos.roomName).inRangeTo(controllerPos, 3)) {
                orientation = HQ_UPGRADE_TOP;
                anchor = ANCHOR_TOP;
            }
        } else {
            if (new RoomPosition(space.x + ANCHOR_RIGHT.x, space.y + ANCHOR_RIGHT.y, controllerPos.roomName).inRangeTo(controllerPos, 3)) {
                orientation = HQ_UPGRADE_RIGHT;
                anchor = ANCHOR_RIGHT;
            } else if (new RoomPosition(space.x + ANCHOR_LEFT.x, space.y + ANCHOR_LEFT.y, controllerPos.roomName).inRangeTo(controllerPos, 3)) {
                orientation = HQ_UPGRADE_LEFT;
                anchor = ANCHOR_LEFT;
            }
        }
        if (!orientation || !anchor) continue;

        let costMatrix = currentRoomPlan.clone();

        // Discourage pathing along the border
        for (let y = 0; y < 50; y++) {
            costMatrix.set(1, y, 20);
            costMatrix.set(48, y, 20);
        }
        for (let x = 2; x < 48; x++) {
            costMatrix.set(x, 1, 20);
            costMatrix.set(x, 48, 20);
        }

        for (let y = 0; y < orientation.length; y++) {
            for (let x = 0; x < orientation[y].length; x++) {
                const tile = orientation[y][x]
                if (tile === undefined) {
                    continue;
                } else if ((OBSTACLE_OBJECT_TYPES as string[]).includes(tile)) {
                    costMatrix.set(space.x + x, space.y + y, 255);
                } else if (tile === STRUCTURE_ROAD) {
                    costMatrix.set(space.x + x, space.y + y, 1);
                }
            }
        }

        // Verify paths from anchor to points of interest
        let origin = new RoomPosition(space.x + anchor.x, space.y + anchor.x, controllerPos.roomName);
        if (!validatePathsToPointsOfInterest(roomName, costMatrix, origin)) continue; // This layout blocks paths

        // Score this position
        let distance = 0;
        for (let pos of sources) {
            let path = PathFinder.search(
                origin,
                {pos, range: 1},
                {maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10}
            );
            if (!path.incomplete) {
                distance += path.cost;
            }
        }
        if (distance >= bestDistance) continue; // We already have a better layout
        bestDistance = distance;
        bestPlan = plan;

        // Valid room plan
        for (let y = 0; y < orientation.length; y++) {
            for (let x = 0; x < orientation[y].length; x++) {
                let pos = new RoomPosition(space.x + x, space.y + y, controllerPos.roomName);
                switch (orientation[y][x]) {
                    case STRUCTURE_SPAWN:
                        plan.spawn = new PlannedStructure(pos, STRUCTURE_SPAWN);
                        break;
                    case STRUCTURE_POWER_SPAWN:
                        plan.powerSpawn = new PlannedStructure(pos, STRUCTURE_POWER_SPAWN);
                        break;
                    case STRUCTURE_FACTORY:
                        plan.factory = new PlannedStructure(pos, STRUCTURE_FACTORY);
                        break;
                    case STRUCTURE_LINK:
                        plan.link = new PlannedStructure(pos, STRUCTURE_LINK);
                        break;
                    case STRUCTURE_STORAGE:
                        plan.storage = new PlannedStructure(pos, STRUCTURE_STORAGE);
                        break;
                    case STRUCTURE_TERMINAL:
                        plan.terminal = new PlannedStructure(pos, STRUCTURE_TERMINAL);
                        break;
                    case STRUCTURE_TOWER:
                        plan.towers?.push(new PlannedStructure(pos, STRUCTURE_TOWER));
                        break;
                    case STRUCTURE_ROAD:
                        plan.roads?.push(new PlannedStructure(pos, STRUCTURE_ROAD));
                        break;
                }
            }
        }

        // plan.ramparts = generateRampartPositions(roomName, space)
        //     .filter(pos => isPositionWalkable(pos, true, true))
        //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));

        plan.walls = calculateAdjacentPositions(controllerPos)
            .filter(pos => isPositionWalkable(pos, true, true))
            .map(pos => new PlannedStructure(pos, STRUCTURE_WALL));
    }

    return validateHeadquartersPlan(bestPlan);
}

function generateRampartPositions(roomName: string, space: {x: number, y: number, horizontal: boolean}) {
    let results = [];
    const w = space.horizontal ? 7 : 5;
    const h = space.horizontal ? 5 : 7;
    for (let x = space.x - 1; x < space.x + w - 1; x++) {
        results.push(new RoomPosition(x, space.y - 1, roomName));
        results.push(new RoomPosition(x, space.y - 2 + h, roomName));
    }
    for (let y = space.y; y < space.y + h - 2; y++) {
        results.push(new RoomPosition(space.x - 1, y, roomName));
        results.push(new RoomPosition(space.x - 2 + w, y, roomName));
    }
    return results;
}

function *findSpaces(controllerPos: RoomPosition, currentRoomPlan: CostMatrix) {
    // Lay out the grid, cropping for edges
    let x = Math.max(1, controllerPos.x - 5);
    let y = Math.max(1, controllerPos.y - 5);
    let width = Math.min(48, controllerPos.x + 5) - x + 1;
    let height = Math.min(48, controllerPos.y + 5) - y + 1;

    let stamp = {
        x: HQ_UPGRADE_LEFT.length,
        y: HQ_UPGRADE_LEFT[0].length,
    }

    let grid: {x: number, y: number}[][] = [];
    let terrain = Game.map.getRoomTerrain(controllerPos.roomName);

    for (let yGrid = 0; yGrid < height; yGrid++) {
        grid[yGrid] = [];
        for (let xGrid = 0; xGrid < width; xGrid++) {
            // For each cell...
            let t = terrain.get(x+xGrid, y+yGrid)
            // If the cell is a wall, adjacent to the controller, or occupied by a planned structure, reset its value to 0,0
            if (
                t === TERRAIN_MASK_WALL ||
                controllerPos.inRangeTo(x+xGrid, y+yGrid, 1) ||
                currentRoomPlan.get(x+xGrid, y+yGrid) === 255
            ) {
                grid[yGrid][xGrid] = {x: 0, y: 0};
                continue;
            }
            // Otherwise, increment it based on the value of
            // its top and left neighbors
            grid[yGrid][xGrid] = {
                x: 1 + (grid[yGrid]?.[xGrid-1]?.x ?? 0),
                y: 1 + (grid[yGrid-1]?.[xGrid]?.y ?? 0)
            };

            // If the values are greater than (3,5), and opposite corners agree, there is room for a vertical HQ
            if (
                grid[yGrid][xGrid].x >= stamp.x &&
                grid[yGrid][xGrid].y >= stamp.y &&
                (grid[yGrid][xGrid - stamp.x + 1]?.y ?? 0) >= stamp.y &&
                (grid[yGrid - stamp.y + 1]?.[xGrid].x ?? 0) >= stamp.x
            ) {
                yield { x: x + xGrid - stamp.x + 1, y: y + yGrid - stamp.y + 1, horizontal: false }
            }
            // If the values are greater than (3,5), there is room for a horizontal HQ
            if (
                grid[yGrid][xGrid].x >= stamp.y &&
                grid[yGrid][xGrid].y >= stamp.x &&
                (grid[yGrid][xGrid - stamp.y + 1]?.y ?? 0) >= stamp.x &&
                (grid[yGrid - stamp.x + 1]?.[xGrid].x ?? 0) >= stamp.y
            ) {
                yield { x: x + xGrid - stamp.y + 1, y: y + yGrid - stamp.x + 1, horizontal: true }
            }
        }
    }
}
