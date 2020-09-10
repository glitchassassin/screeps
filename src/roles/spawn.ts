const BUILDS: {[id: string]: any[]} = {
    PIONEER: [WORK, CARRY, MOVE],
    STATIONARYWORKER: [WORK, WORK, CARRY, MOVE],
    MOBILEWORKER: [WORK, CARRY, CARRY, MOVE],
    HAULER: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
    MAXMINER: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE] // 700
}
export enum ROLES {
    PIONEER = 'PIONEER',
    MINER = 'MINER',
    BUILDER = 'BUILDER',
    HAULER = 'HAULER',
    UPGRADER = 'UPGRADER',
}
const QUOTAS: {[id: string]: {count: number, build: any[], role: ROLES}} = {
    pioneer: {
        count: 2,
        build: BUILDS.PIONEER,
        role: ROLES.PIONEER
    },
    miner: {
        count: 5,
        build: BUILDS.STATIONARYWORKER,
        role: ROLES.MINER
    },
    upgrader: {
        count: 2,
        build: BUILDS.STATIONARYWORKER,
        role: ROLES.UPGRADER
    },
    hauler: {
        count: 1,
        build: BUILDS.HAULER,
        role: ROLES.HAULER
    },
    builder: {
        count: 1,
        build: BUILDS.STATIONARYWORKER,
        role: ROLES.BUILDER
    },
}

export const run = (spawn: StructureSpawn) => {
    // Wait for energy to accumulate
    if (spawn.store.getUsedCapacity(RESOURCE_ENERGY) < 200) return;

    Object.keys(QUOTAS).forEach(unit => {
        if (Object.values(Game.creeps).filter(creep => creep.memory.unit === unit).length < QUOTAS[unit].count) {
            console.log(`Spawning new ${unit}`);
            spawn.spawnCreep(QUOTAS[unit].build, `${unit} ${Game.time}`, {
                memory: {
                    role: QUOTAS[unit].role,
                    unit
                }
            })
        }
    });
}