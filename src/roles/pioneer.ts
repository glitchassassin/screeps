import { harvest } from "behaviors/harvest";
import { upgrade } from "behaviors/upgrade";
import { build } from "behaviors/build";
import { deposit } from "behaviors/deposit";
import { repair } from "behaviors/repair";
import { withdraw } from "behaviors/withdraw";

enum MODES {
    HARVESTING,
    SUPPLYING,
    BUILDING,
    REPAIRING,
    DEPOSITING,
    UPGRADING,
    WAITING
}

export const run = (creep: Creep) => {
    switch (creep.memory.mode) {
        case MODES.HARVESTING:
            if (creep.store.getFreeCapacity() > 0) {
                // if empty, harvest resources until full
                withdraw(creep) || harvest(creep)
                break;
            }
            else {
                // if full, try to supply a spawn
                creep.memory.mode = MODES.SUPPLYING;
            }
        case MODES.SUPPLYING:
            if (deposit(creep, [STRUCTURE_SPAWN, STRUCTURE_EXTENSION])) break;
            creep.memory.mode = MODES.BUILDING;
        case MODES.BUILDING:
            // if there is a building, build it
            if (build(creep)) break;
            // otherwise, look for something to repair
            creep.memory.mode = MODES.REPAIRING;
        case MODES.REPAIRING:
            // If there is something to repair, repair it
            if (repair(creep)) break;
            // otherwise, look for somewhere to deposit loot
            creep.memory.mode = MODES.DEPOSITING;
        case MODES.DEPOSITING:
            // If there is somewhere to deposit loot, do so
            if (deposit(creep, [STRUCTURE_CONTAINER])) break;
            // otherwise, upgrade the room controller
            creep.memory.mode = MODES.UPGRADING;
        case MODES.UPGRADING:
            // If we can upgrade the room controller, do so
            if (upgrade(creep)) break;
            // Otherwise, complain, and start the cycle over
            creep.say("I'm bored!")
        default:
            creep.memory.mode = MODES.HARVESTING;
    }
    if(creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.mode = MODES.HARVESTING;
        creep.say('🔄 harvesting');
    }
}
