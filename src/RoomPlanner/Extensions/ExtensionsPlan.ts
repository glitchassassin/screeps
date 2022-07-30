import { ExtensionsPlan } from "RoomPlanner";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { costMatrixFromRoomPlan } from "Selectors/costMatrixFromRoomPlan";
import { calculateAdjacentPositions, getRangeTo, isPositionWalkable } from "Selectors/Map/MapCoordinates";
import { getCostMatrix } from "Selectors/Map/Pathing";
import { roomPlans } from "Selectors/roomPlans";
import { isRoomPosition } from "Selectors/typeguards";
import { validateExtensionsPlan } from "./validateExtensionsPlan";

export const planExtensions = (roomName: string) => {
    const plan: Partial<ExtensionsPlan> = {
        extensions: [],
        ramparts: [],
    }
    plan.extensions = sortExtensions(fillExtensions(roomName, CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8]));
    // plan.ramparts = outlineExtensions(roomName, plan.extensions)
    //     .filter(pos => isPositionWalkable(pos, true))
    //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
    return validateExtensionsPlan(plan);
}


export function fillExtensions(roomName: string, count: number) {
    if (count <= 0) return [];

    let terrain = Game.map.getRoomTerrain(roomName);
    const cm = costMatrixFromRoomPlan(roomName);
    const hq = roomPlans(roomName)?.headquarters;

    let startingPositions = new Set(
        [hq?.terminal.pos, hq?.powerSpawn.pos]
            .filter(isRoomPosition)
            .flatMap(calculateAdjacentPositions)
            .filter(pos => squareIsValid(terrain, cm, pos))
    )

    if (!startingPositions) throw new Error('No viable starting position, aborting extensions plan')

    // Begin extensions outside HQ, offset diagonally from storage
    let extensions = fillExtensionsRecursive(terrain, cm, Array.from(startingPositions), count);

    if (extensions.length < count) {
        throw new Error('Not enough room to fill extensions')
    }

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
        extensions = extensions.concat(fillExtensionsRecursive(terrain, costMatrix, extensions, nextIterationCount))
    }
    return extensions;
}

function getNeighboringExtensionSquares(pos: RoomPosition) {
    // Valid squares:
    // X O X
    // O O O
    // X O X

    let valid = [];
    if (pos.x > 5 && pos.y > 5) valid.push(new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName));
    if (pos.x > 5 && pos.y < 44) valid.push(new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName));
    if (pos.x < 44 && pos.y > 5) valid.push(new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName));
    if (pos.x < 44 && pos.y < 44) valid.push(new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName));
    return valid;
}

function squareIsValid(terrain: RoomTerrain, costMatrix: CostMatrix, pos: RoomPosition) {
    let positions = [
        pos,
        new RoomPosition(Math.max(0, pos.x - 1), pos.y, pos.roomName),
        new RoomPosition(Math.min(49, pos.x + 1), pos.y, pos.roomName),
        new RoomPosition(pos.x, Math.max(0, pos.y - 1), pos.roomName),
        new RoomPosition(pos.x, Math.min(49, pos.y + 1), pos.roomName),
    ]
    return positions.every(p => (
        terrain.get(p.x, p.y) !== TERRAIN_MASK_WALL &&
        costMatrix.get(p.x, p.y) < 255
    ))
}

function sortExtensions(extensions: PlannedStructure[]) {
    // Start with first extension
    let route: PlannedStructure[] = []

    let nodes = extensions.slice();

    let lastPoint = extensions[0].pos;
    while (nodes.length > 0) {
        let shortest = nodes.map(s => {
            const distanceFromStart = getRangeTo(s.pos, extensions[0].pos);
            let path = PathFinder.search(
                lastPoint,
                { pos: s.pos, range: 1 },
                {
                    roomCallback: n => getCostMatrix(n),
                    plainCost: 2,
                    swampCost: 10,
                }
            )

            if (path.incomplete) throw new Error(`Unable to generate logistics route from ${lastPoint} to ${s.pos}`);

            return { s, length: path.cost + distanceFromStart }
        }).reduce((a, b) => (!b || a.length < b.length) ? a : b);

        route.push(shortest.s);
        nodes = nodes.filter(s => s !== shortest.s);
        lastPoint = shortest.s.pos
    }

    return route;
}

function outlineExtensions(roomName: string, extensions: PlannedStructure[]) {
    const results = [];
    for (let ext of extensions) {
        let neighbors = getNeighboringExtensionSquares(ext.pos);
        let neighborsStatus = neighbors.map(pos => (
            !isPositionWalkable(pos, true, true) ||
            extensions.some(e => e.pos.isEqualTo(pos))
        ));

        if (neighborsStatus.every(p => p === true)) continue; // Internal extension - all neighbors covered

        results.push(ext.pos) // Need a rampart where extension will be

        // Top Left -> Bottom Left
        if (neighborsStatus[0] !== neighborsStatus[1]) {
            // Need left rampart
            results.push(new RoomPosition(ext.pos.x - 1, ext.pos.y, roomName))
        }
        // Bottom Left -> Bottom Right
        if (neighborsStatus[1] !== neighborsStatus[3]) {
            // Need bottom rampart
            results.push(new RoomPosition(ext.pos.x, ext.pos.y + 1, roomName))
        }
        // Top Right -> Bottom Right
        if (neighborsStatus[2] !== neighborsStatus[3]) {
            // Need right rampart
            results.push(new RoomPosition(ext.pos.x + 1, ext.pos.y, roomName))
        }
        // Top Left -> Top Right
        if (neighborsStatus[0] !== neighborsStatus[2]) {
            // Need top rampart
            results.push(new RoomPosition(ext.pos.x, ext.pos.y - 1, roomName))
        }
    }
    return results;
}
