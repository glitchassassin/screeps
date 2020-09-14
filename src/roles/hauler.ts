import { withdraw } from "behaviors/withdraw";
import { deposit } from "behaviors/deposit";

const findContainerByFlag = (flag: Flag) => {
    let container = flag.pos.lookFor(LOOK_STRUCTURES)
        .find(structure => (
            structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_CONTAINER ||
            structure.structureType === STRUCTURE_EXTENSION
        ))

    if (!container) return null;
    return container as StructureContainer;
}

const findEmptyDestinationContainer = () => {
    let target: StructureContainer|null = null;
    let targetFlag: string|null = null;
    for (let flag in Game.flags) {
        if (!Game.flags[flag].name.startsWith('dest')) continue;

        let container = findContainerByFlag(Game.flags[flag]);

        if (!container) continue;

        if (!target || (
                container.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                container.store.getUsedCapacity(RESOURCE_ENERGY) < target.store.getUsedCapacity(RESOURCE_ENERGY))
            ) {
            target = container;
            targetFlag = Game.flags[flag].name;
        }
    }
    targetFlag && console.log(`[${targetFlag}] Emptiest destination`);
    return targetFlag;
}

const findFullSourceContainer = () => {
    let target: StructureContainer|null = null;
    let targetFlag: string|null = null;
    for (let flag in Game.flags) {
        if (!Game.flags[flag].name.startsWith('source')) continue;

        let container = findContainerByFlag(Game.flags[flag]);

        if (!container) continue;

        if (!target || container.store.getUsedCapacity(RESOURCE_ENERGY) > target.store.getUsedCapacity(RESOURCE_ENERGY)) {
            target = container;
            targetFlag = Game.flags[flag].name;
        }
    }
    targetFlag && console.log(`[${targetFlag}] Fullest source`);
    return targetFlag
}

export const run = (creep: Creep) => {
    if(!creep.memory.destination) {
        creep.memory.destination = findFullSourceContainer();
    }
    let target = Object.values(Game.flags).find(flag => flag.name === creep.memory.destination);
    if (!target) {
        console.log(`[${creep.name}] Cannot find hauling target`)
        return;
    }

    // We are not currently moving. Are we near the destination flag?
    if (!creep.pos.isNearTo(target.pos)) {
        creep.moveTo(target.pos);
    } else {
        if (target.name.startsWith('source')) {
            withdraw(creep);
            // Find the destination flag with the most empty container
            creep.memory.destination = findEmptyDestinationContainer();
        }
        else if (target.name.startsWith('dest')) {
            deposit(creep, [STRUCTURE_CONTAINER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION]);
            // If hauler still has goods, find next destination container
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.memory.destination = findEmptyDestinationContainer();
            } else {
                // Find the source flag with the most full container
                creep.memory.destination = findFullSourceContainer();
            }
        }
    }
}
