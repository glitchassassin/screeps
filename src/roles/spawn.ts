const BUILDS: {[id: string]: any[]} = {
    PIONEER: [WORK, CARRY, MOVE],
    STATIONARYWORKER: [WORK, WORK, CARRY, MOVE],
    MOBILEWORKER: [WORK, CARRY, CARRY, MOVE],
    HAULER: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], // 550
    THUG: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE], // 550
    MAXMINER: [WORK, WORK, WORK, WORK, WORK, MOVE] // 550
}
export enum ROLES {
    PIONEER = 'PIONEER',
    MINER = 'MINER',
    BUILDER = 'BUILDER',
    HAULER = 'HAULER',
    UPGRADER = 'UPGRADER',
    THUG = 'THUG'
}

export const run = (spawn: StructureSpawn) => {
    let level = spawn.room.controller?.level;
    let extensionsCount = spawn.room.find(FIND_MY_STRUCTURES)
                .filter(structure => structure.structureType === STRUCTURE_EXTENSION).length;

    if (level && level < 2 || extensionsCount < 5) {
        // First priority - *n* Pioneers, where *n* = available mining spots adjacent to sources
        let sourceCount = spawn.room.find(FIND_SOURCES).length * 2 // Approximation - should check if surrounding squares are blocked
        let pioneerCount = spawn.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.unit === 'pioneer').length;
        if (pioneerCount < sourceCount) {
            spawn.spawnCreep(BUILDS.PIONEER, `pioneer ${Game.time}`, { memory: {
                role: ROLES.PIONEER,
                unit: 'pioneer'
            }})
            return;
        }
        // Second priority - 1 Upgrader
        if (!spawn.room.find(FIND_MY_CREEPS).find(creep => creep.memory.unit === 'upgrader')) {
            spawn.spawnCreep(BUILDS.STATIONARYWORKER, `upgrader ${Game.time}`, { memory: {
                role: ROLES.UPGRADER,
                unit: 'upgrader'
            }})
            return;
        }
    } else {
        // First priority - 1 Miner per unassigned source container
        let unassignedSourceContainer = Object.values(Game.flags).find(flag => (
            flag.name.startsWith('source') &&
            !spawn.room.find(FIND_MY_CREEPS).find(creep => creep.memory.mine === flag.name)
        ))
        if (extensionsCount > 5 && unassignedSourceContainer) {
            spawn.spawnCreep(BUILDS.MINER, `miner ${Game.time}`, { memory: {
                role: ROLES.MINER,
                unit: 'miner'
            }})
            return;
        }
        // Second priority - 2 haulers per active miner
        let minerCount = spawn.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.unit === 'miner').length;
        let haulerCount = spawn.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.unit === 'hauler').length;
        if (haulerCount < 2 * minerCount) {
            spawn.spawnCreep(BUILDS.HAULER, `hauler ${Game.time}`, { memory: {
                role: ROLES.HAULER,
                unit: 'hauler'
            }})
            return;
        }
        // Third priority - 2 builders
        let builderCount = spawn.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.unit === 'builder').length;
        if (builderCount < 2) {
            spawn.spawnCreep(BUILDS.BUILDER, `builder ${Game.time}`, { memory: {
                role: ROLES.BUILDER,
                unit: 'builder'
            }})
            return;
        }
        // Fourth priority - 4 upgraders
        let upgraderCount = spawn.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.unit === 'upgrader').length;
        if (upgraderCount < 4) {
            spawn.spawnCreep(BUILDS.UPGRADER, `upgrader ${Game.time}`, { memory: {
                role: ROLES.UPGRADER,
                unit: 'upgrader'
            }})
            return;
        }
        // Fifth priority - 4 thugs
        let thugCount = spawn.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.unit === 'thug').length;
        if (thugCount < 4) {
            spawn.spawnCreep(BUILDS.THUG, `thug ${Game.time}`, { memory: {
                role: ROLES.THUG,
                unit: 'thug'
            }})
            return;
        }
    }
}
