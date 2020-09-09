const BUILDS: {[id: string]: any[]} = {
    harvester: [WORK, CARRY, MOVE],
    builder: [WORK, CARRY, MOVE],
    upgrader: [WORK, CARRY, MOVE],
}
const QUOTAS: {[id: string]: number} = {
    harvester: 1,
    builder: 3,
    upgrader: 1,
}

export const run = (spawn: StructureSpawn) => {
    // Wait for energy to accumulate
    if (spawn.store.getUsedCapacity(RESOURCE_ENERGY) < 200) return;

    Object.keys(QUOTAS).forEach(role => {
        if (Object.values(Game.creeps).filter(creep => creep.memory.role === role).length < QUOTAS[role]) {
            console.log(`Spawning new ${role}`);
            spawn.spawnCreep(BUILDS[role], `${role} ${Game.time}`, {memory: {role}})
        }
    });
}
