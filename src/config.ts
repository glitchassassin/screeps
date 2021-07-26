/**
 * Rooms around an Office to control as remote territories
 */
export const TERRITORY_RADIUS = 0;

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

export const WHITELIST = [
    'CrAzYDubC'
]

export const CACHED_STRUCTURES: StructureConstant[] = [
    STRUCTURE_CONTAINER
]

export const PROFILE = {
    managers: false,
    requests: false
}
