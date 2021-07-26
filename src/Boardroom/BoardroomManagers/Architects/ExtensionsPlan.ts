import { lazyFilter, lazyMap } from "utils/lazyIterators";

import { BlockPlan } from "./classes/BlockPlan";
import { BlockPlanBuilder } from "./classes/BlockPlanBuilder";
import { FranchisePlan } from "./FranchisePlan";
import { HeadquartersPlan } from "./HeadquartersPlan";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { MinePlan } from "./MinePlan";
import { PlannedStructure } from "./classes/PlannedStructure";

export function fillExtensions(roomName: string, roomBlock: BlockPlan, count: number) {
    if (count <= 0) return [];

    let terrain = Game.map.getRoomTerrain(roomName);
    let cm = new PathFinder.CostMatrix();
    let storagePos: RoomPosition|undefined = undefined;

    for (let struct of roomBlock.structures) {
        if (struct.structureType === STRUCTURE_STORAGE) storagePos = struct.pos;
        if (struct.structureType === STRUCTURE_EXTENSION) count--;
        if (!([STRUCTURE_ROAD, STRUCTURE_RAMPART] as string[]).includes(struct.structureType)) cm.set(struct.pos.x, struct.pos.y, 255);
    }

    if (!storagePos) throw new Error('No storage in room plan, aborting extensions plan')

    // Begin extensions outside HQ, offset diagonally from storage
    let extensions = fillExtensionsRecursive(terrain, cm, [storagePos], count);

    if (extensions.length < count) throw new Error('Not enough room to fill extensions')

    extensions.sort(MapAnalyst.sortByDistanceTo(storagePos));

    return extensions.map(pos => new PlannedStructure(pos, STRUCTURE_EXTENSION));
}

function fillExtensionsRecursive(terrain: RoomTerrain, costMatrix: CostMatrix, startingPositions: RoomPosition[], count: number) {
    let extensions: RoomPosition[] = [];
    let nextIterationCount = count;
    for (let startingPosition of startingPositions) {
        let squares = getNeighboringExtensionSquares(startingPosition)

        // Set up neighboring squares, if needed
        for (let square of squares) {
            if (nextIterationCount === 0) break;
            if (squareIsValid(terrain, costMatrix, square)) {
                extensions.unshift(square);
                costMatrix.set(square.x, square.y, 255);
                nextIterationCount -= 1;
            }
        }

        if (nextIterationCount <= 0) break;
    }
    if (nextIterationCount > 0 && extensions.length > 0) {
        extensions.push(...fillExtensionsRecursive(terrain, costMatrix, extensions, nextIterationCount))
    }
    return extensions;
}

function getNeighboringExtensionSquares(pos: RoomPosition) {
    // Valid squares:
    // X O X
    // O O O
    // X O X

    let valid = [];
    if (pos.x > 2 && pos.y > 2) valid.push(new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName));
    if (pos.x > 2 && pos.y < 47) valid.push(new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName));
    if (pos.x < 47 && pos.y > 2) valid.push(new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName));
    if (pos.x < 47 && pos.y < 47) valid.push(new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName));
    return valid;
}

function squareIsValid(terrain: RoomTerrain, costMatrix: CostMatrix, pos: RoomPosition) {
    let positions = [
        pos,
        new RoomPosition(Math.max(0, pos.x-1), pos.y, pos.roomName),
        new RoomPosition(Math.min(49, pos.x+1), pos.y, pos.roomName),
        new RoomPosition(pos.x, Math.max(0, pos.y-1), pos.roomName),
        new RoomPosition(pos.x, Math.min(49, pos.y+1), pos.roomName),
    ]
    return positions.every(p => (
        terrain.get(p.x, p.y) !== TERRAIN_MASK_WALL &&
        costMatrix.get(p.x, p.y) < 255
    ))
}

function *outlineExtensions(roomName: string, extensions: PlannedStructure[]) {
    for (let ext of extensions) {
        let neighbors = getNeighboringExtensionSquares(ext.pos);
        let neighborsStatus = neighbors.map(pos => (
            !MapAnalyst.isPositionWalkable(pos, true) ||
            extensions.some(e => e.pos.isEqualTo(pos))
        ));

        if (neighborsStatus.every(p => p === true)) continue; // Internal extension - all neighbors covered

        yield ext.pos // Need a rampart where extension will be

        // Top Left -> Bottom Left
        if (neighborsStatus[0] !== neighborsStatus[1]) {
            // Need left rampart
            yield new RoomPosition(ext.pos.x - 1, ext.pos.y, roomName)
        }
        // Bottom Left -> Bottom Right
        if (neighborsStatus[1] !== neighborsStatus[3]) {
            // Need bottom rampart
            yield new RoomPosition(ext.pos.x, ext.pos.y + 1, roomName)
        }
        // Top Right -> Bottom Right
        if (neighborsStatus[2] !== neighborsStatus[3]) {
            // Need right rampart
            yield new RoomPosition(ext.pos.x + 1, ext.pos.y, roomName)
        }
        // Top Left -> Top Right
        if (neighborsStatus[0] !== neighborsStatus[2]) {
            // Need top rampart
            yield new RoomPosition(ext.pos.x, ext.pos.y - 1, roomName)
        }
    }
}

export class ExtensionsPlan extends BlockPlanBuilder {
    public extensions!: PlannedStructure[];
    public ramparts!: PlannedStructure[];

    deserialize() {
        this.extensions = this.blockPlan.getStructures(STRUCTURE_EXTENSION);
        this.ramparts = this.blockPlan.getStructures(STRUCTURE_RAMPART);
    }

    plan(roomName: string, franchise1: FranchisePlan, franchise2: FranchisePlan, mine: MinePlan, headquarters: HeadquartersPlan) {
        let roomPlan = new BlockPlan();
        roomPlan.structures.push(
            ...franchise1.blockPlan.structures,
            ...franchise2.blockPlan.structures,
            ...mine.blockPlan.structures,
            ...headquarters.blockPlan.structures,
        )
        this.extensions = fillExtensions(roomName, roomPlan, CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8]);
        this.ramparts = Array.from(lazyMap(
            lazyFilter(
                outlineExtensions(roomName, this.extensions),
                pos => MapAnalyst.isPositionWalkable(pos, true)
            ),
            pos => new PlannedStructure(pos, STRUCTURE_RAMPART)
        ));
        this.blockPlan.structures.push(
            ...this.extensions,
            ...this.ramparts
        );
        return this;
    }
}
