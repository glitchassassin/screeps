import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { calculateAdjacentPositions, isPositionWalkable } from "Selectors/MapCoordinates";
import { deserializePlannedStructures } from "Selectors/plannedStructures";
import { posById } from "Selectors/posById";


const HQ_UPGRADE_LEFT: StructureConstant[][] = [
    [STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER],
    [STRUCTURE_TERMINAL, STRUCTURE_ROAD, STRUCTURE_ROAD],
    [STRUCTURE_CONTAINER, STRUCTURE_SPAWN, STRUCTURE_STORAGE],
    [STRUCTURE_LINK, STRUCTURE_ROAD, STRUCTURE_ROAD],
    [STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER],
]

const HQ_UPGRADE_RIGHT = HQ_UPGRADE_LEFT.map(row => [...row].reverse());

const HQ_UPGRADE_TOP = HQ_UPGRADE_LEFT[0].map((k, i) => HQ_UPGRADE_LEFT.map(row => row[i]))

const HQ_UPGRADE_BOTTOM = HQ_UPGRADE_RIGHT[0].map((k, i) => HQ_UPGRADE_RIGHT.map(row => row[i]))

export interface HeadquartersPlan {
    spawn: PlannedStructure;
    link: PlannedStructure;
    container: PlannedStructure;
    storage: PlannedStructure;
    terminal: PlannedStructure;
    towers: PlannedStructure[];
    roads: PlannedStructure[];
    walls: PlannedStructure[];
}

export const deserializeHeadquartersPlan = (serialized: string) => {
    const plan: Partial<HeadquartersPlan> = {
        spawn: undefined,
        link: undefined,
        container: undefined,
        storage: undefined,
        terminal: undefined,
        towers: [],
        roads: [],
        walls: [],
    }
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_SPAWN) plan.spawn = s;
        if (s.structureType === STRUCTURE_LINK) plan.link = s;
        if (s.structureType === STRUCTURE_CONTAINER) plan.container = s;
        if (s.structureType === STRUCTURE_STORAGE) plan.storage = s;
        if (s.structureType === STRUCTURE_TERMINAL) plan.terminal = s;
        if (s.structureType === STRUCTURE_TOWER) plan.towers?.push(s);
        if (s.structureType === STRUCTURE_ROAD) plan.roads?.push(s);
        if (s.structureType === STRUCTURE_WALL) plan.walls?.push(s);
    }
    return validateHeadquartersPlan(plan);
}

const validateHeadquartersPlan = (plan: Partial<HeadquartersPlan>) => {
    if (
        !plan.spawn || !plan.link || !plan.container || !plan.storage || !plan.terminal ||
        !plan.towers?.length || !plan.roads?.length || !plan.walls?.length
    ) {
        console.log(JSON.stringify(plan))
        throw new Error(`Incomplete HeadquartersPlan`)
    } else {
        return plan as HeadquartersPlan;
    }
}

export const planHeadquarters = (roomName: string) => {
    // Calculate from scratch
    if (!Memory.rooms[roomName]) throw new Error('No data cached for planning room')
    let controllerPos = posById(Memory.rooms[roomName].controllerId)
    if (!controllerPos) throw new Error('No known controller in room, unable to compute plan')
    let sources = Memory.rooms[roomName].sourceIds?.map(s => posById(s)).filter(s => s) as RoomPosition[] ?? []
    if (sources.length < 2) throw new Error('Expected two sources for headquarters planning');

    let bestDistance = Infinity;
    let bestPlan: Partial<HeadquartersPlan> = {};

    for (let space of findSpaces(controllerPos, sources)) {
        let plan: Partial<HeadquartersPlan> = {
            spawn: undefined,
            link: undefined,
            container: undefined,
            storage: undefined,
            terminal: undefined,
            towers: [],
            roads: [],
            walls: [],
        }
        // Orient the space
        //            X X X
        // X X O X X  X X X
        // X X X X X  O X O <-- +2,+2
        // X X O X X  X X X
        //     ^      X X X
        //   +2,+2
        // There are two valid upgrading locations; range to Controller
        // will determine which orientation the Headquarters has. We
        // only need to check one pos for either horizontal or vertical

        // Get the upgrade location closest to Controller
        let orientation: StructureConstant[][];
        let inRange = new RoomPosition(space.x + 2, space.y + 2, controllerPos.roomName).inRangeTo(controllerPos, 3);
        if (space.horizontal) {
            if (inRange) {
                orientation = HQ_UPGRADE_BOTTOM;
            } else {
                orientation = HQ_UPGRADE_TOP;
            }
        } else {
            if (inRange) {
                orientation = HQ_UPGRADE_RIGHT;
            } else {
                orientation = HQ_UPGRADE_LEFT;
            }
        }

        let costMatrix = new PathFinder.CostMatrix();

        for (let y = 0; y < orientation.length; y++) {
            for (let x = 0; x < orientation[y].length; x++) {
                // Container is an "obstacle" because the upgrading creep will stay there
                if ((OBSTACLE_OBJECT_TYPES as string[]).includes(orientation[y][x]) || orientation[y][x] === STRUCTURE_CONTAINER) {
                    costMatrix.set(space.x + x, space.y + y, 255);
                } else if (orientation[y][x] === STRUCTURE_ROAD) {
                    costMatrix.set(space.x + x, space.y + y, 1);
                }
            }
        }

        // Verify paths from spawning squares to both sources
        let spawnPoints = [
            new RoomPosition(space.x + 1, space.y + 1, controllerPos.roomName),
            (space.horizontal ?
                new RoomPosition(space.x + 3, space.y + 1, controllerPos.roomName) :
                new RoomPosition(space.x + 1, space.y + 3, controllerPos.roomName)
            )
        ];
        let roads = new Set<PlannedStructure>();
        let distance = 0;
        if (sources.some(source =>
            spawnPoints.some(pos =>
                {
                    let path = PathFinder.search(
                        pos,
                        {pos: source, range: 1},
                        {maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10}
                    );
                    if (!path.incomplete) {
                        path.path.forEach(p => {
                            roads.add(new PlannedStructure(p, STRUCTURE_ROAD));
                            costMatrix.set(p.x, p.y, 1);
                        });
                        distance += path.cost;
                    }
                    return path.incomplete
                }

            )
        )) continue; // Invalid room plan
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
                    case STRUCTURE_LINK:
                        plan.link = new PlannedStructure(pos, STRUCTURE_LINK);
                        break;
                    case STRUCTURE_CONTAINER:
                        plan.container = new PlannedStructure(pos, STRUCTURE_CONTAINER);
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
                        roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
                        break;
                }

                if ((OBSTACLE_OBJECT_TYPES as string[]).includes(orientation[y][x]) || orientation[y][x] === STRUCTURE_CONTAINER) {
                    costMatrix.set(space.x + x, space.y + y, 255)
                }
            }
        }

        plan.roads = Array.from(roads);

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

function *findSpaces(controllerPos: RoomPosition, sources: RoomPosition[]) {
    // Lay out the grid, cropping for edges
    let x = Math.max(1, controllerPos.x - 5);
    let y = Math.max(1, controllerPos.y - 5);
    let width = Math.min(48, controllerPos.x + 5) - x + 1;
    let height = Math.min(48, controllerPos.y + 5) - y + 1;

    let grid: {x: number, y: number}[][] = [];
    let terrain = Game.map.getRoomTerrain(controllerPos.roomName);

    for (let yGrid = 0; yGrid < height; yGrid++) {
        grid[yGrid] = [];
        for (let xGrid = 0; xGrid < width; xGrid++) {
            // For each cell...
            let t = terrain.get(x+xGrid, y+yGrid)
            // If the cell is a wall, adjacent to the controller, or within 5 squares of a source, reset its value to 0,0
            if (
                t === TERRAIN_MASK_WALL ||
                controllerPos.inRangeTo(x+xGrid, y+yGrid, 1) ||
                sources.some(s => s.inRangeTo(x+xGrid, y+yGrid, 5))
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
                grid[yGrid][xGrid].x >= 3 &&
                grid[yGrid][xGrid].y >= 5 &&
                (grid[yGrid][xGrid - 2]?.y ?? 0) >= 5 &&
                (grid[yGrid - 4]?.[xGrid].x ?? 0) >= 3
            ) {
                yield { x: x + xGrid - 2, y: y + yGrid - 4, horizontal: false }
            }
            // If the values are greater than (3,5), there is room for a horizontal HQ
            if (
                grid[yGrid][xGrid].x >= 5 &&
                grid[yGrid][xGrid].y >= 3 &&
                (grid[yGrid][xGrid - 4]?.y ?? 0) >= 3 &&
                (grid[yGrid - 2]?.[xGrid].x ?? 0) >= 5
            ) {
                yield { x: x + xGrid - 4, y: y + yGrid - 2, horizontal: true }
            }
        }
    }
}
