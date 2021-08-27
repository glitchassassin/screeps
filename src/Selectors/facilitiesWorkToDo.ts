import { BARRIER_LEVEL, BARRIER_TYPES, BUILD_PRIORITIES, REPAIR_THRESHOLD } from "config";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { calculateAdjacentPositions } from "./MapCoordinates";
import { plannedStructuresByRcl } from "./plannedStructuresByRcl";


export const destroyUnplannedStructures = (room: string) => {
    if (!Game.rooms[room]?.controller?.my || !Memory.roomPlans?.[room]?.office) return;
    const allPlannedStructures = plannedStructuresByRcl(room, 8)
    // Destroy all controller-limited structures
    Game.rooms[room].find(FIND_STRUCTURES).forEach(s => {
        if (s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTROLLER) {
            s.destroy()
        }
    })
    Game.rooms[room].find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove())
    allPlannedStructures.forEach(structure => {
        calculateAdjacentPositions(structure.pos).forEach(pos => {
            let structures = pos.lookFor(LOOK_STRUCTURES);
            for (let s of structures) {
                if (!allPlannedStructures.some(planned => planned.pos.isEqualTo(s.pos) && planned.structureType === s.structureType)) {
                    // Destroy unplanned adjacent structures
                    if (s.structureType === STRUCTURE_WALL) {
                        s.destroy()
                    }
                }
            }
        });
        const existingSite = structure.pos.lookFor(LOOK_CONSTRUCTION_SITES).shift();
        if (existingSite && existingSite.structureType !== structure.structureType) {
            existingSite.remove();
        }
    })

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

    // Only re-scan work to do every 500 ticks unless structure count changes
    if (!Game.rooms[officeName]) return cache[officeName].work.slice();

    const foundStructures = Game.rooms[officeName].find(FIND_STRUCTURES).length
    const foundRcl = Game.rooms[officeName].controller?.level;
    if (
        (foundStructures !== undefined && foundStructures !== cache[officeName].structureCount) ||
        (foundRcl !== undefined && foundRcl !== cache[officeName].rcl) ||
        Game.time % 500 === 0
    ) {
        console.log('Recalculating facilities cache')
        cache[officeName] = {
            work: plannedStructuresByRcl(officeName)
                .filter(structure => plannedStructureNeedsWork(structure))
                .sort((a, b) => BUILD_PRIORITIES[b.structureType] - BUILD_PRIORITIES[a.structureType]),
            structureCount: foundStructures,
            rcl: foundRcl,
        }
    }

    return cache[officeName].work.slice();
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
