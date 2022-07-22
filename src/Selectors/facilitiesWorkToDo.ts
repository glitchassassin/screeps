import { BARRIER_LEVEL, BARRIER_TYPES, REPAIR_THRESHOLD } from "config";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { memoizeByTick } from "utils/memoizeFunction";
import { calculateAdjacentPositions, getRangeTo } from "./Map/MapCoordinates";
import { plannedStructuresByRcl } from "./plannedStructuresByRcl";
import { roomPlans } from "./roomPlans";


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
    rcl?: number,
    cost: number,
}

let cache: Record<string, FacilitiesCache> = {};
let rangeCache = new Map<string, number>();

/**
 * Cache is actually populated by
 */
export function facilitiesWorkToDoAverageRange(office: string) {
    if (!rangeCache.has(office)) {
        let ranges = 0;
        let count = 0;
        let storagePos = roomPlans(office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office);
        for (let structure of cache[office]?.work || []) {
            // Also populate range cache
            if (plannedStructureNeedsWork(structure)) {
                ranges += getRangeTo(structure.pos, storagePos);
                count += 1;
            }
        }
        // console.log(storagePos, ranges, count)
        rangeCache.set(office, count ? ranges / count : 0)
    }
    return rangeCache.get(office) ?? 0;
}

export const facilitiesEfficiency = memoizeByTick(
    office => office,
    (office: string) => {
        const work = facilitiesWorkToDo(office).slice(0, 20);
        const range = facilitiesWorkToDoAverageRange(office)
        const constructionToDo = work.length > 0 ? work.filter(s => !s.structure).length / work.length : 0;
        if (range === 0) return 0.5;
        const energyUsed = constructionToDo ? BUILD_POWER : REPAIR_COST * REPAIR_POWER
        const workTime = (CARRY_CAPACITY / energyUsed);
        const travelTime = Math.max(0, range - 3) * 2;
        const efficiency = workTime / (workTime + travelTime)
        // console.log('range', range, 'energyUsed', energyUsed, 'workTime', workTime, 'travelTime', travelTime, 'efficiency', efficiency);
        return efficiency
    }
)

export const facilitiesEfficiencyByStructure = (office: string, structure: PlannedStructure) => {
    const storage = roomPlans(office)?.headquarters?.storage.pos;
    const range = storage ? getRangeTo(storage, structure.pos) : 25;
    const energyUsed = structure.structure ? REPAIR_COST * REPAIR_POWER : BUILD_POWER
    const workTime = (CARRY_CAPACITY / energyUsed);
    const travelTime = Math.max(0, range - 3) * 2;
    const efficiency = workTime / (workTime + travelTime)
    return efficiency;
}

let cacheReviewed = new Map<string, number>();

export const refreshFacilitiesWorkCache = (officeName: string) => {
    // Initialize cache
    cache[officeName] ??= { work: [], cost: 0 };

    if (cacheReviewed.get(officeName) === Game.time) return;

    // Filter out completed work
    let ranges = 0;
    let count = 0;
    let cost = 0;
    let work = [];
    let storagePos = roomPlans(officeName)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, officeName);
    for (let structure of cache[officeName].work) {
        // Also populate range cache
        const range = getRangeTo(structure.pos, storagePos);
        const energyNeeded = adjustedEnergyForPlannedStructure(structure, range);
        if (!structure.structure || energyNeeded > CARRY_CAPACITY) {
            work.push(structure);
            ranges += range;
            count += 1;
            cost += energyNeeded;
        }
    }
    // console.log(storagePos, ranges, count)
    rangeCache.set(officeName, count ? ranges / count : 0)
    cache[officeName].work = work;
    cache[officeName].cost = cost;
    cacheReviewed.set(officeName, Game.time);

    // Only re-scan work to do every 500 ticks unless structure count changes
    if (!Game.rooms[officeName]) return;

    const foundStructures = Game.rooms[officeName].find(FIND_STRUCTURES).length
    const foundRcl = Game.rooms[officeName].controller?.level;
    if (
        (foundStructures !== cache[officeName].structureCount) ||
        (foundRcl !== undefined && foundRcl !== cache[officeName].rcl) ||
        Game.time % 500 === 0
    ) {
        // console.log('Recalculating facilities cache')
        cache[officeName] = {
            work: [],
                // .sort((a, b) => BUILD_PRIORITIES[b.structureType] - BUILD_PRIORITIES[a.structureType]),
            structureCount: foundStructures,
            rcl: foundRcl,
            cost: 0,
        }
        plannedStructuresByRcl(officeName).forEach(structure => {
            const range = getRangeTo(structure.pos, storagePos);
            const energyNeeded = adjustedEnergyForPlannedStructure(structure, range);
            if (energyNeeded > 0) {
                cache[officeName].work.push(structure);
                cache[officeName].cost += energyNeeded;
            }
        })
    }
}
export const facilitiesWorkToDo = memoizeByTick(
    officeName => officeName,
    (officeName: string) => {
        refreshFacilitiesWorkCache(officeName);
        return cache[officeName].work.slice();
    }
)

export const facilitiesCostPending = (officeName: string) => {
    refreshFacilitiesWorkCache(officeName);
    return cache[officeName].cost;
}

export const plannedStructureNeedsWork = (structure: PlannedStructure, repairing = false) => {
    structure.survey();
    if (!structure.structure) {
        // Structure needs to be built; check if we can place a construction site
        return !(
            (Memory.rooms[structure.pos.roomName].owner && Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
            (Memory.rooms[structure.pos.roomName].reserver && Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether')
        );
    } else {
        const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits < (maxHits * (repairing ? 1 : REPAIR_THRESHOLD))) {
            return true;
        }
    }
    return false;
}

export const costForPlannedStructure = (structure: PlannedStructure, office: string) => {
    const cost = {
        efficiency: 0,
        cost: 0
    }

    const distance = getRangeTo(
        roomPlans(office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, office),
        structure.pos
    );

    // Calculation assumes Engineers have equal WORK and CARRY and can move 1 sq/tick (generally true with roads)
    if (structure.structure) {
        const workTime = (CARRY_CAPACITY / (REPAIR_COST * REPAIR_POWER));
        cost.efficiency = workTime / (workTime + (distance * 2));
        const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits > (maxHits * REPAIR_THRESHOLD)) {
            return cost;
        }
        const repairNeeded = maxHits - structure.structure.hits;
        cost.cost = (repairNeeded * REPAIR_COST);
    } else if (structure.constructionSite) {
        // Structure needs to be finished
        const workTime = (CARRY_CAPACITY / BUILD_POWER);
        cost.efficiency = workTime / (workTime + (distance * 2));
        cost.cost = (structure.constructionSite.progressTotal - structure.constructionSite.progress);
    } else {
        if (!(
            (Memory.rooms[structure.pos.roomName].owner && Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
            (Memory.rooms[structure.pos.roomName].reserver && Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether')
        )) {
            // Structure needs to be built
            const workTime = (CARRY_CAPACITY / BUILD_POWER);
            cost.efficiency = workTime / (workTime + (distance * 2));
            cost.cost = CONSTRUCTION_COST[structure.structureType];
        } else {
            // Hostile territory, cannot build
            return cost;
        }
    }

    return cost;
}

export const adjustedEnergyForPlannedStructure = (structure: PlannedStructure, distance: number, threshold = 1) => {
    // Calculation assumes Engineers have equal WORK and CARRY and can move 1 sq/tick (generally true with roads)
    if (structure.structure) {
        const workTime = (CARRY_CAPACITY / (REPAIR_COST * REPAIR_POWER));
        const efficiency = workTime / (workTime + (distance * 2));
        const rcl = Game.rooms[structure.pos.roomName]?.controller?.level ?? 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits > (maxHits * threshold)) {
            return 0;
        }
        const repairNeeded = maxHits - structure.structure.hits;
        return (repairNeeded * REPAIR_COST) / efficiency;
    } else if (structure.constructionSite) {
        // Structure needs to be finished
        const workTime = (CARRY_CAPACITY / BUILD_POWER);
        const efficiency = workTime / (workTime + (distance * 2));
        return (structure.constructionSite.progressTotal - structure.constructionSite.progress) / efficiency
    } else {
        if (!(
            (Memory.rooms[structure.pos.roomName].owner && Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
            (Memory.rooms[structure.pos.roomName].reserver && Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether')
        )) {
            // Structure needs to be built
            const workTime = (CARRY_CAPACITY / BUILD_POWER);
            const efficiency = workTime / (workTime + (distance * 2));
            return CONSTRUCTION_COST[structure.structureType] / efficiency;
        } else {
            // Hostile territory, cannot build
            return 0;
        }
    }
}

export const constructionToDo = memoizeByTick(
    office => office,
    (office: string) => {
        return facilitiesWorkToDo(office).filter(s => !s.structure)
    }
)

export const roadConstructionToDo = memoizeByTick(
    office => office,
    (office: string) => {
        return facilitiesWorkToDo(office).filter(s => s.structureType === STRUCTURE_ROAD && !s.structure)
    }
)
