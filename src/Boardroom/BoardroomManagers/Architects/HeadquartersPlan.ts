import { CachedController, Controllers } from "WorldState/Controllers";
import { CachedSource, Sources } from "WorldState/Sources";

import { LegalData } from "WorldState/LegalData";
import { MapAnalyst } from "../MapAnalyst";
import { PlannedStructure } from "./classes/PlannedStructure";
import { lazyMap } from "utils/lazyIterators";

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

export class HeadquartersPlan {
    spawn!: PlannedStructure;
    link!: PlannedStructure;
    container!: PlannedStructure;
    storage!: PlannedStructure;
    terminal!: PlannedStructure;
    towers: PlannedStructure[] = [];
    roads: PlannedStructure[] = [];

    constructor(roomName: string) {
        // Calculate from scratch
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst
        let controller = Controllers.byRoom(roomName);
        if (!controller) throw new Error('No known controller in room, unable to compute plan')
        let sources = Sources.byRoom(roomName);
        if (sources.length < 2) throw new Error('Expected two sources for headquarters planning');

        let bestDistance = Infinity;

        for (let space of this.findSpaces(controller, sources)) {
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
            let inRange = new RoomPosition(space.x + 2, space.y + 2, controller.pos.roomName).inRangeTo(controller, 3);
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
                new RoomPosition(space.x + 1, space.y + 1, controller.pos.roomName),
                (space.horizontal ?
                    new RoomPosition(space.x + 3, space.y + 1, controller.pos.roomName) :
                    new RoomPosition(space.x + 1, space.y + 3, controller.pos.roomName)
                )
            ];
            let roads = new Set<RoomPosition>();
            let distance = 0;
            if (sources.some(source =>
                spawnPoints.some(pos =>
                    {
                        let path = PathFinder.search(
                            pos,
                            {pos: source.pos, range: 1},
                            {maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10}
                        );
                        if (!path.incomplete) {
                            path.path.forEach(p => {
                                roads.add(p);
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

            // Valid room plan
            this.towers = [];
            for (let y = 0; y < orientation.length; y++) {
                for (let x = 0; x < orientation[y].length; x++) {
                    let pos = new RoomPosition(space.x + x, space.y + y, controller.pos.roomName);
                    switch (orientation[y][x]) {
                        case STRUCTURE_SPAWN:
                            this.spawn = new PlannedStructure(pos, STRUCTURE_SPAWN);
                            break;
                        case STRUCTURE_LINK:
                            this.link = new PlannedStructure(pos, STRUCTURE_LINK);
                            break;
                        case STRUCTURE_CONTAINER:
                            this.container = new PlannedStructure(pos, STRUCTURE_CONTAINER);
                            break;
                        case STRUCTURE_STORAGE:
                            this.storage = new PlannedStructure(pos, STRUCTURE_STORAGE);
                            break;
                        case STRUCTURE_TERMINAL:
                            this.terminal = new PlannedStructure(pos, STRUCTURE_TERMINAL);
                            break;
                        case STRUCTURE_TOWER:
                            this.towers.push(new PlannedStructure(pos, STRUCTURE_TOWER));
                            break;
                        case STRUCTURE_ROAD:
                            roads.add(pos);
                            break;
                    }

                    if ((OBSTACLE_OBJECT_TYPES as string[]).includes(orientation[y][x]) || orientation[y][x] === STRUCTURE_CONTAINER) {
                        costMatrix.set(space.x + x, space.y + y, 255)
                    }
                }
            }

            this.roads = Array.from(lazyMap(roads, road => new PlannedStructure(road, STRUCTURE_ROAD)));
        }
        if (!this.container || !this.link || !this.spawn || !this.storage || !this.terminal || this.towers.length !== 6) {
            throw new Error('No room for a Headquarters block near controller');
        }

        let legalData = LegalData.byRoom(roomName) ?? {
            id: controller.id,
            pos: controller.pos,
        }
        LegalData.set(controller.id, {
            ...legalData,
            containerPos: this.container.pos,
            linkPos: this.link.pos,
        }, roomName)
    }

    *findSpaces(controller: CachedController, sources: CachedSource[]) {
        // Lay out the grid, cropping for edges
        let x = Math.max(1, controller.pos.x - 5);
        let y = Math.max(1, controller.pos.y - 5);
        let width = Math.min(48, controller.pos.x + 5) - x + 1;
        let height = Math.min(48, controller.pos.y + 5) - y + 1;

        let grid: {x: number, y: number}[][] = [];
        let terrain = Game.map.getRoomTerrain(controller.pos.roomName);

        for (let yGrid = 0; yGrid < height; yGrid++) {
            grid[yGrid] = [];
            for (let xGrid = 0; xGrid < width; xGrid++) {
                // For each cell...
                let t = terrain.get(x+xGrid, y+yGrid)
                // If the cell is a wall, adjacent to the controller, or within 3 squares of a source, reset its value to 0,0
                if (
                    t === TERRAIN_MASK_WALL ||
                    controller.pos.inRangeTo(x, y, 1) ||
                    sources.some(s => s.pos.inRangeTo(x, y, 3))
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
}
