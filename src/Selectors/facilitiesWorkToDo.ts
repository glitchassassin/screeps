import { BARRIER_LEVEL, BARRIER_TYPES, BUILD_PRIORITIES, REPAIR_THRESHOLD } from "config";

import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { calculateAdjacentPositions } from "./MapCoordinates";
import { plannedStructuresByRcl } from "./plannedStructuresByRcl";

export const destroyAdjacentUnplannedStructures = (officeName: string, structure: PlannedStructure) => {
    const allPlannedStructures = plannedStructuresByRcl(officeName, 8)
    calculateAdjacentPositions(structure.pos).forEach(pos => {
        let structures = pos.lookFor(LOOK_STRUCTURES);
        for (let s of structures) {
            if (!allPlannedStructures.some(planned => planned.pos.isEqualTo(s.pos) && planned.structureType === s.structureType)) {
                // Destroy unplanned adjacent structures
                if (s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_SPAWN) {
                    s.destroy()
                }
            }
        }
    });
    const existingSite = structure.pos.lookFor(LOOK_CONSTRUCTION_SITES).shift();
    if (existingSite && existingSite.structureType !== structure.structureType) {
        existingSite.remove();
    }
}

interface FacilitiesCache {
    work: PlannedStructure[],
    structureCount?: number,
    rcl?: number
}

let cache: Record<string, FacilitiesCache> = {};

export const facilitiesWorkToDo = (officeName: string) => {
    // Initialize cache
    cache[officeName] ??= { work: [] };

    // Filter out completed work
    cache[officeName].work = cache[officeName].work
        .filter(structure => plannedStructureNeedsWork(structure))
        .sort((a, b) => BUILD_PRIORITIES[b.structureType] - BUILD_PRIORITIES[a.structureType]);

    // Only re-scan work to do every 500 ticks unless structure count changes
    if (!Game.rooms[officeName]) return [...cache[officeName].work];

    const foundStructures = Game.rooms[officeName].find(FIND_STRUCTURES).length
    const foundRcl = Game.rooms[officeName].controller?.level;
    if (
        (foundStructures !== undefined && foundStructures !== cache[officeName].structureCount) ||
        (foundRcl !== undefined && foundRcl !== cache[officeName].rcl) ||
        Game.time % 500 === 0
    ) {
        cache[officeName] = {
            work: plannedStructuresByRcl(officeName)
                .filter(structure => plannedStructureNeedsWork(structure)),
            structureCount: foundStructures,
            rcl: foundRcl,
        }
    }

    return [...cache[officeName].work];
}

export const plannedStructureNeedsWork = (structure: PlannedStructure) => {
    if (!structure.structure) {
        // Structure needs to be built
        return true;
    } else {
        const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits < (maxHits * REPAIR_THRESHOLD)) {
            return true;
        }
    }
    return false;
}
