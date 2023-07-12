export const FEATURES = {
  MINING: true,
  LABS: true,
  WHITELIST: true,
  POWER: true
};

/**
 * Rooms around an Office to control as remote territories
 */
export const TERRITORY_RADIUS = Game.shard.name === 'shard2' ? 0 : 3;

/**
 * Number of offices to control
 */
export const OFFICE_LIMIT = (() => {
  if (Game.shard.name === 'shard2') return 1;
  if (Game.shard.name === 'screepsplus0') return 1;
  return 2;
})();

/**
 * Support new rooms until they reach this RCL
 */
export const ACQUIRE_MAX_RCL = 4;

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
  3: 3000,
  4: 100000,
  5: 100000,
  6: 300000,
  7: 1000000,
  8: 3000000
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
 * Health amount before dispatching repairers
 */
export const REPAIR_THRESHOLD = CARRY_CAPACITY * 10;

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

export const MISSION_HISTORY_LIMIT = 1500;

export const MAX_POWER_BANK_DISTANCE = 500;

export const THREAT_TOLERANCE = {
  remote: {
    0: 0,
    1: 10,
    2: 10,
    3: 20,
    4: 30,
    5: 40,
    6: 60,
    7: 80,
    8: 120
  } as Record<number, number>
};

export const CPU_ESTIMATE_PERIOD = 10000 / Game.cpu.limit;
