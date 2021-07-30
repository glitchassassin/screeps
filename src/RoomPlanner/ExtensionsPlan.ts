import { isPositionWalkable, sortByDistanceTo } from "Selectors/MapCoordinates";

import { FranchisePlan } from "./FranchisePlan";
import { HeadquartersPlan } from "./HeadquartersPlan";
import { MinePlan } from "./MinePlan";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { deserializePlannedStructures } from "Selectors/plannedStructures";

export interface ExtensionsPlan {
    extensions: PlannedStructure[];
    ramparts: PlannedStructure[];
}

export const deserializeExtensionsPlan = (serialized: string) => {
    const plan: Partial<ExtensionsPlan> = {
        extensions: [],
        ramparts: [],
    }
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_EXTENSION) plan.extensions?.push(s);
        if (s.structureType === STRUCTURE_RAMPART) plan.ramparts?.push(s);
    }
    return validateExtensionsPlan(plan);
}

const validateExtensionsPlan = (plan: Partial<ExtensionsPlan>) => {
    if ((plan.extensions?.length !== 60) || !plan.ramparts?.length) {
        throw new Error(`Incomplete ExtensionsPlan`)
    } else {
        return plan as ExtensionsPlan;
    }
}

export const planExtensions = (roomName: string, franchise1: FranchisePlan, franchise2: FranchisePlan, mine: MinePlan, headquarters: HeadquartersPlan) => {
    const plan: Partial<ExtensionsPlan> = {
        extensions: [],
        ramparts: [],
    }
    let roomPlan: PlannedStructure[] = []
    const {sourceId: s1, ...franchise1structures} = franchise1
    const {sourceId: s2, ...franchise2structures} = franchise2
    roomPlan.push(
        ...Object.values(franchise1structures).flat(),
        ...Object.values(franchise2structures).flat(),
        ...Object.values(mine).flat(),
        ...Object.values(headquarters).flat(),
    )
    plan.extensions = fillExtensions(roomName, roomPlan, CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8]);
    plan.ramparts = outlineExtensions(roomName, plan.extensions)
        .filter(pos => isPositionWalkable(pos, true))
        .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
    return validateExtensionsPlan(plan);
}


export function fillExtensions(roomName: string, structures: PlannedStructure[], count: number) {
    if (count <= 0) return [];

    let terrain = Game.map.getRoomTerrain(roomName);
    let cm = new PathFinder.CostMatrix();
    let storagePos: RoomPosition|undefined = undefined;

    for (let struct of structures) {
        if (struct.structureType === STRUCTURE_STORAGE) storagePos = struct.pos;
        if (struct.structureType === STRUCTURE_EXTENSION) count--;
        if (!([STRUCTURE_ROAD, STRUCTURE_RAMPART] as string[]).includes(struct.structureType)) cm.set(struct.pos.x, struct.pos.y, 255);
    }

    if (!storagePos) throw new Error('No storage in room plan, aborting extensions plan')

    // Begin extensions outside HQ, offset diagonally from storage
    let extensions = fillExtensionsRecursive(terrain, cm, [storagePos], count);

    if (extensions.length < count) throw new Error('Not enough room to fill extensions')

    extensions.sort(sortByDistanceTo(storagePos));

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

function outlineExtensions(roomName: string, extensions: PlannedStructure[]) {
    const results = [];
    for (let ext of extensions) {
        let neighbors = getNeighboringExtensionSquares(ext.pos);
        let neighborsStatus = neighbors.map(pos => (
            !isPositionWalkable(pos, true) ||
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
