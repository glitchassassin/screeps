const BUILDS: {[id: string]: any[]} = {
    PIONEER: [WORK, CARRY, MOVE],
    STATIONARYWORKER: [WORK, WORK, CARRY, MOVE],
    MOBILEWORKER: [WORK, CARRY, CARRY, MOVE],
    HAULER: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
    MAXMINER: [WORK, WORK, WORK, WORK, WORK, MOVE] // 550
}
export enum ROLES {
    PIONEER = 'PIONEER',
    MINER = 'MINER',
    BUILDER = 'BUILDER',
    HAULER = 'HAULER',
    UPGRADER = 'UPGRADER',
}

// TODO: Prioritize Quotas
// TODO: Set up Quotas by Phase
const QUOTAS: {[id: string]: {count: number, build: any[], role: ROLES}} = {
    pioneer: {
        count: 0,
        build: BUILDS.PIONEER,
        role: ROLES.PIONEER
    },
    miner: {
        count: 2,
        build: BUILDS.MAXMINER,
        role: ROLES.MINER
    },
    upgrader: {
        count: 4,
        build: BUILDS.STATIONARYWORKER,
        role: ROLES.UPGRADER
    },
    hauler: {
        count: 4,
        build: BUILDS.HAULER,
        role: ROLES.HAULER
    },
    builder: {
        count: 3,
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
            let memory: any = {
                role: QUOTAS[unit].role,
                unit,
            };
            if (QUOTAS[unit].role === ROLES.MINER) {
                // Get all available source flags
                let sources = Object.keys(Game.flags)
                    .filter(flag => (
                        flag.startsWith('source') &&
                        !Object.values(Game.creeps).find(creep => creep.memory.mine === flag)
                    ));
                if (!sources) return;
                memory.mine = sources[0];
            }
            spawn.spawnCreep(QUOTAS[unit].build, `${unit} ${Game.time}`, { memory })
        }
    });
}
