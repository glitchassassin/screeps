import { BARRIER_LEVEL, BARRIER_TYPES } from "config";

import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { calculateAdjacentPositions } from "./MapCoordinates";
import { plannedStructuresByRcl } from "./plannedStructuresByRcl";

export const destroyAdjacentUnplannedStructures = (officeName: string, structure: PlannedStructure) => {
    const allPlannedStructures = plannedStructuresByRcl(officeName, 8)
    calculateAdjacentPositions(structure.pos).forEach(pos => {
        let structures = pos.lookFor(LOOK_STRUCTURES);
        for (let s of structures) {
            if (!allPlannedStructures.some(planned => planned.structure === s)) {
                // Destroy unplanned adjacent structures
                if (s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_SPAWN) {
                    s.destroy()
                }
            }
        }
    })
}

let cachedFacilitiesWork: PlannedStructure[] = [];
let structureCount = 0;
let rcl = 0;

export const facilitiesWorkToDo = (officeName: string) => {
    // Filter out completed work
    cachedFacilitiesWork = cachedFacilitiesWork
        .filter(structure => plannedStructureNeedsWork(structure));

    // Only re-scan work to do every 500 ticks unless structure count changes
    const foundStructures = Game.rooms[officeName].find(FIND_STRUCTURES).length
    const foundRcl = Game.rooms[officeName].controller?.level ?? 0;
    if (foundStructures !== structureCount || foundRcl !== rcl || Game.time % 500 === 0) {
        structureCount = foundStructures;
        rcl = foundRcl;
        cachedFacilitiesWork = plannedStructuresByRcl(officeName)
            .filter(structure => plannedStructureNeedsWork(structure));
    }

    return [...cachedFacilitiesWork];
}

export const plannedStructureNeedsWork = (structure: PlannedStructure) => {
    if (!structure.structure) {
        // Structure needs to be built
        return true;
    } else {
        const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits < (maxHits * 0.7)) {
            return true;
        }
    }
    return false;
}
