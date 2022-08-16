export const FEATURES = {
  MINING: true,
  LABS: true,
  WHITELIST: true
};

/**
 * Rooms around an Office to control as remote territories
 */
export const TERRITORY_RADIUS = Game.shard.name === 'shard3' ? 1 : 3;

/**
 * Number of offices to control
 */
export const OFFICE_LIMIT = Game.shard.name === 'shard3' ? 1 : Infinity;

/**
 * Storage level targets by RCL
 */
export const STORAGE_LEVEL: Record<number, number> = {
  1: 2e3,
  2: 2e3,
  3: 2e3,
  4: 1e4,
  5: 5e4,
  6: 1e5,
  7: 3e5,
  8: 5e5
};

/**
 * Barrier level targets by RCL
 */
export const BARRIER_LEVEL: Record<number, number> = {
  1: 3000,
  2: 3000,
  3: 10000,
  4: 50000,
  5: 100000,
  6: 300000,
  7: 1000000,
  8: 10000000
};
export const BARRIER_TYPES: StructureConstant[] = [STRUCTURE_WALL, STRUCTURE_RAMPART];
/**
 * Build priorities
 */
export const BUILD_PRIORITIES: Record<BuildableStructureConstant, number> = {
  [STRUCTURE_CONTAINER]: 5,
  [STRUCTURE_EXTENSION]: 7,
  [STRUCTURE_EXTRACTOR]: 5,
  [STRUCTURE_FACTORY]: 5,
  [STRUCTURE_LAB]: 5,
  [STRUCTURE_LINK]: 5,
  [STRUCTURE_NUKER]: 2,
  [STRUCTURE_OBSERVER]: 5,
  [STRUCTURE_POWER_SPAWN]: 5,
  [STRUCTURE_RAMPART]: 3,
  [STRUCTURE_ROAD]: 4,
  [STRUCTURE_SPAWN]: 7,
  [STRUCTURE_STORAGE]: 6,
  [STRUCTURE_TERMINAL]: 3,
  [STRUCTURE_TOWER]: 5,
  [STRUCTURE_WALL]: 5
};
/**
 * Health percentage before dispatching repairers
 */
export const REPAIR_THRESHOLD = 0.5;

export const FRANCHISE_RETRY_INTERVAL = 100000;

export const FRANCHISE_EVALUATE_PERIOD = 10;

export const WHITELIST = FEATURES.WHITELIST ? ['CrAzYDubC', 'thmsn', 'Joboe'] : [];

export const CACHED_STRUCTURES: StructureConstant[] = [STRUCTURE_CONTAINER];

export const MINERAL_PRIORITIES: MineralConstant[] = [
  RESOURCE_CATALYST,
  RESOURCE_UTRIUM,
  RESOURCE_KEANIUM,
  RESOURCE_LEMERGIUM,
  RESOURCE_ZYNTHIUM,
  RESOURCE_HYDROGEN,
  RESOURCE_OXYGEN
];

export const MISSION_HISTORY_LIMIT = 15000;

export const THREAT_TOLERANCE = {
  remote: {
    0: 0,
    1: 0,
    2: 0,
    3: 10,
    4: 20,
    5: 30,
    6: 40,
    7: 80,
    8: 120
  } as Record<number, number>
};
