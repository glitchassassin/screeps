import { BlockPlan } from "./classes/BlockPlan";
import { PlannedStructure } from "./classes/PlannedStructure";

export function fillExtensions(roomName: string, roomBlock: BlockPlan, count: number) {
    if (count <= 0) return;

    let terrain = Game.map.getRoomTerrain(roomName);
    let cm = new PathFinder.CostMatrix();
    let storagePos: RoomPosition|undefined = undefined;

    for (let struct of roomBlock.structures) {
        if (struct.structureType === STRUCTURE_STORAGE) storagePos = struct.pos;
        if (struct.structureType === STRUCTURE_EXTENSION) count--;
        if (struct.structureType !== STRUCTURE_ROAD) cm.set(struct.pos.x, struct.pos.y, 255);
    }

    if (!storagePos) throw new Error('No storage in room plan, aborting extensions plan')

    // Begin extensions outside HQ, offset diagonally from storage
    let extensions = fillExtensionsRecursive(terrain, cm, [storagePos], count);

    if (extensions.length < count) throw new Error('Not enough room to fill extensions')

    extensions.forEach(pos => roomBlock.structures.push(new PlannedStructure(pos, STRUCTURE_EXTENSION)));
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
                console.log('Placing extension at', square, nextIterationCount - 1, 'remaining');
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
    if (pos.x > 1 && pos.y > 1) valid.push(new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName));
    if (pos.x > 1 && pos.y < 48) valid.push(new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName));
    if (pos.x < 48 && pos.y > 1) valid.push(new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName));
    if (pos.x < 48 && pos.y < 48) valid.push(new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName));
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
