

export const FEATURES = {
    MINING: true,
    LABS: true,
    WHITELIST: true,
}

/**
 * Rooms around an Office to control as remote territories
 */
export const TERRITORY_RADIUS = Game.shard.name === 'shard3' ? 0 : 2;

/**
 * Storage level targets by RCL
 */
 export const STORAGE_LEVEL: Record<number, number> = {
    1: 2e+3,
    2: 2e+3,
    3: 2e+3,
    4: 1e+4,
    5: 5e+4,
    6: 1e+5,
    7: 3e+5,
    8: 5e+5,
}

/**
 * Barrier level targets by RCL
 */
export const BARRIER_LEVEL: Record<number, number> = {
    1: 3e+3,
    2: 3e+3,
    3: 1e+4,
    4: 5e+4,
    5: 1e+5,
    6: 1e+5,
    7: 1e+5,
    8: 1e+5,
}
export const BARRIER_TYPES: StructureConstant[] = [
    STRUCTURE_WALL,
    STRUCTURE_RAMPART
]
/**
 * Build priorities
 */
export const BUILD_PRIORITIES: Record<BuildableStructureConstant, number> = {
    [STRUCTURE_CONTAINER]:      5,
    [STRUCTURE_EXTENSION]:      7,
    [STRUCTURE_EXTRACTOR]:      5,
    [STRUCTURE_FACTORY]:        5,
    [STRUCTURE_LAB]:            5,
    [STRUCTURE_LINK]:           5,
    [STRUCTURE_NUKER]:          2,
    [STRUCTURE_OBSERVER]:       5,
    [STRUCTURE_POWER_SPAWN]:    5,
    [STRUCTURE_RAMPART]:        3,
    [STRUCTURE_ROAD]:           2,
    [STRUCTURE_SPAWN]:          7,
    [STRUCTURE_STORAGE]:        6,
    [STRUCTURE_TERMINAL]:       3,
    [STRUCTURE_TOWER]:          5,
    [STRUCTURE_WALL]:           5,
}
/**
 * Health percentage before dispatching repairers
 */
export const REPAIR_THRESHOLD = 0.5;

export const WHITELIST = FEATURES.WHITELIST ? [
    'CrAzYDubC'
] : [];

export const CACHED_STRUCTURES: StructureConstant[] = [
    STRUCTURE_CONTAINER
]

export const MINERAL_PRIORITIES: MineralConstant[] = [
    RESOURCE_CATALYST,
    RESOURCE_UTRIUM,
    RESOURCE_KEANIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN
]
